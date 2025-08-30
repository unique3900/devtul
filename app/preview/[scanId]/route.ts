import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const { scanId } = params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version') || 'original';
    
    const downloadDir = path.join(process.cwd(), "downloads", scanId);
    
    // Determine which HTML file to serve
    const htmlFile = version === 'fixed' ? 'index_fixed.html' : 'index.html';
    const htmlPath = path.join(downloadDir, htmlFile);
    
    try {
      const htmlContent = await fs.readFile(htmlPath, "utf-8");
      
      // Inject preview-specific styles and scripts
      const enhancedHtml = injectPreviewEnhancements(htmlContent, scanId, version);
      
      return new NextResponse(enhancedHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (error) {
      return new NextResponse("Preview not found", { status: 404 });
    }
    
  } catch (error) {
    console.error("Preview error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

function injectPreviewEnhancements(html: string, scanId: string, version: string): string {
  // Add preview-specific CSS and JavaScript
  const previewStyles = `
    <style id="preview-enhancements">
      /* Preview-specific styles */
      .accessibility-highlight {
        outline: 2px solid #ff6b6b !important;
        outline-offset: 2px !important;
        position: relative !important;
      }
      
      .accessibility-highlight::after {
        content: '⚠️';
        position: absolute !important;
        top: -10px !important;
        right: -10px !important;
        background: #ff6b6b !important;
        color: white !important;
        border-radius: 50% !important;
        width: 20px !important;
        height: 20px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 12px !important;
        z-index: 10000 !important;
      }
      
      .accessibility-fixed {
        outline: 2px solid #51cf66 !important;
        outline-offset: 2px !important;
        position: relative !important;
      }
      
      .accessibility-fixed::after {
        content: '✓';
        position: absolute !important;
        top: -10px !important;
        right: -10px !important;
        background: #51cf66 !important;
        color: white !important;
        border-radius: 50% !important;
        width: 20px !important;
        height: 20px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 12px !important;
        z-index: 10000 !important;
      }
      
      .preview-tooltip {
        position: absolute !important;
        background: rgba(0, 0, 0, 0.9) !important;
        color: white !important;
        padding: 8px 12px !important;
        border-radius: 4px !important;
        font-size: 14px !important;
        max-width: 300px !important;
        z-index: 10001 !important;
        pointer-events: none !important;
        opacity: 0 !important;
        transition: opacity 0.2s !important;
      }
      
      .preview-tooltip.show {
        opacity: 1 !important;
      }
      
      /* Ensure fixed version shows improvements */
      ${version === 'fixed' ? `
        img:not([alt]) {
          outline: 2px solid #51cf66 !important;
        }
        
        [role="button"]:focus,
        button:focus,
        a:focus {
          outline: 2px solid #4dabf7 !important;
          outline-offset: 2px !important;
        }
      ` : ''}
    </style>
  `;
  
  const previewScript = `
    <script id="preview-script">
      (function() {
        let tooltip = null;
        
        function createTooltip() {
          tooltip = document.createElement('div');
          tooltip.className = 'preview-tooltip';
          document.body.appendChild(tooltip);
        }
        
        function showTooltip(element, message, x, y) {
          if (!tooltip) createTooltip();
          tooltip.textContent = message;
          tooltip.style.left = x + 'px';
          tooltip.style.top = (y - 40) + 'px';
          tooltip.classList.add('show');
        }
        
        function hideTooltip() {
          if (tooltip) {
            tooltip.classList.remove('show');
          }
        }
        
        // Load accessibility issues for this scan
        fetch('/api/get-issues/${scanId}')
          .then(response => response.json())
          .then(data => {
            if (data.issues) {
              highlightIssues(data.issues);
            }
          })
          .catch(console.error);
        
        function highlightIssues(issues) {
          issues.forEach(issue => {
            try {
              const elements = document.querySelectorAll(issue.elementPath || issue.element);
              elements.forEach(element => {
                const isFixed = '${version}' === 'fixed' && issue.fixed;
                element.classList.add(isFixed ? 'accessibility-fixed' : 'accessibility-highlight');
                
                element.addEventListener('mouseenter', (e) => {
                  const message = isFixed 
                    ? \`✓ Fixed: \${issue.message}\`
                    : \`⚠️ Issue: \${issue.message}\`;
                  showTooltip(element, message, e.pageX, e.pageY);
                });
                
                element.addEventListener('mouseleave', hideTooltip);
              });
            } catch (error) {
              console.warn('Could not highlight element:', issue.elementPath, error);
            }
          });
        }
        
        // Add click handler for issue details
        document.addEventListener('click', function(e) {
          const target = e.target;
          if (target.classList.contains('accessibility-highlight') || 
              target.classList.contains('accessibility-fixed')) {
            e.preventDefault();
            // Could open a modal with issue details
            console.log('Clicked accessibility issue element:', target);
          }
        });
        
      })();
    </script>
  `;
  
  // Inject styles and scripts before closing head tag
  let enhancedHtml = html;
  
  if (html.includes('</head>')) {
    enhancedHtml = html.replace('</head>', previewStyles + previewScript + '</head>');
  } else {
    // If no head tag, add at the beginning of body
    enhancedHtml = html.replace('<body', previewStyles + previewScript + '<body');
  }
  
  return enhancedHtml;
}

#!/usr/bin/env python3
"""
Advanced RAG-powered Accessibility Fixing Agent
Optimized for low token consumption and high accuracy
"""

import json
import re
import sys
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import google.generativeai as genai
from bs4 import BeautifulSoup, Tag
import argparse

# Configure Gemini API
genai.configure(api_key="AIzaSyCH5kpJdB_4cFbCbCkUzLKDhS2C6HHIxyg")

@dataclass
class AccessibilityIssue:
    id: str
    type: str
    severity: str
    message: str
    element: str
    element_path: str
    wcag_rule: str
    suggestion: str
    context: str = ""

@dataclass
class FixResult:
    issue_id: str
    fixed: bool
    original_element: str
    fixed_element: str
    explanation: str
    confidence: float
    tokens_used: int

class WCAGKnowledgeBase:
    """Optimized WCAG knowledge base for context-aware fixes"""
    
    def __init__(self):
        self.rules = {
            "1.1.1": {
                "name": "Non-text Content",
                "level": "A",
                "description": "All non-text content has text alternative",
                "patterns": ["img", "area", "input[type=image]"],
                "fixes": {
                    "missing_alt": 'alt="{description}"',
                    "empty_alt_decorative": 'alt="" role="presentation"',
                    "complex_image": 'alt="{brief}" longdesc="{detailed}"'
                }
            },
            "1.3.1": {
                "name": "Info and Relationships",
                "level": "A", 
                "description": "Information, structure, and relationships can be programmatically determined",
                "patterns": ["h1", "h2", "h3", "h4", "h5", "h6", "table", "form"],
                "fixes": {
                    "heading_skip": "Adjust heading level to maintain hierarchy",
                    "missing_table_headers": 'Add <th scope="col/row">',
                    "form_no_fieldset": "Wrap related inputs in <fieldset><legend>"
                }
            },
            "1.4.3": {
                "name": "Contrast (Minimum)",
                "level": "AA",
                "description": "Text has contrast ratio of at least 4.5:1",
                "patterns": ["color", "background-color"],
                "fixes": {
                    "low_contrast": "Adjust colors to meet 4.5:1 ratio",
                    "large_text": "Large text needs 3:1 ratio minimum"
                }
            },
            "2.1.1": {
                "name": "Keyboard",
                "level": "A",
                "description": "All functionality available from keyboard",
                "patterns": ["onclick", "onmousedown", "onmouseup"],
                "fixes": {
                    "missing_keyboard": 'Add tabindex="0" and onkeydown handler',
                    "keyboard_trap": "Ensure Tab/Shift+Tab navigation works"
                }
            },
            "2.4.4": {
                "name": "Link Purpose",
                "level": "A", 
                "description": "Purpose of link can be determined from link text",
                "patterns": ["a[href]"],
                "fixes": {
                    "generic_link": 'Add descriptive text or aria-label',
                    "empty_link": 'Add meaningful link text'
                }
            },
            "4.1.2": {
                "name": "Name, Role, Value",
                "level": "A",
                "description": "Name and role can be programmatically determined",
                "patterns": ["[role]", "input", "button"],
                "fixes": {
                    "missing_name": 'Add aria-label or aria-labelledby',
                    "invalid_role": 'Use valid ARIA role',
                    "missing_state": 'Add aria-expanded, aria-checked, etc.'
                }
            }
        }
    
    def get_rule_context(self, wcag_rule: str) -> Dict:
        """Get optimized context for a WCAG rule"""
        return self.rules.get(wcag_rule, {})
    
    def get_fix_template(self, wcag_rule: str, issue_type: str) -> str:
        """Get specific fix template for issue type"""
        rule = self.rules.get(wcag_rule, {})
        return rule.get("fixes", {}).get(issue_type, "")

class AccessibilityAgent:
    """Main agent for processing accessibility fixes"""
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        self.knowledge_base = WCAGKnowledgeBase()
        self.token_count = 0
        
    def analyze_element_context(self, element_html: str, full_html: str) -> str:
        """Extract minimal context around element for efficient processing"""
        soup = BeautifulSoup(full_html, 'html.parser')
        target_soup = BeautifulSoup(element_html, 'html.parser')
        target_element = target_soup.find()
        
        if not target_element:
            return ""
        
        # Find element in full document
        elements = soup.find_all(target_element.name)
        for elem in elements:
            if str(elem) == element_html:
                # Get parent context (limited to reduce tokens)
                parent = elem.parent
                siblings = [str(s)[:100] for s in elem.find_next_siblings()[:2]]
                prev_siblings = [str(s)[:100] for s in elem.find_previous_siblings()[:2]]
                
                context = {
                    "parent": str(parent.name) if parent else "body",
                    "next": siblings,
                    "prev": prev_siblings,
                    "children_count": len(elem.find_all())
                }
                return json.dumps(context)
        
        return ""
    
    def create_optimized_prompt(self, issue: AccessibilityIssue, context: str) -> str:
        """Create highly optimized prompt to minimize token usage"""
        
        rule_context = self.knowledge_base.get_rule_context(issue.wcag_rule)
        fix_template = self.knowledge_base.get_fix_template(issue.wcag_rule, issue.type)
        
        # Ultra-compact prompt structure
        prompt = f"""Fix WCAG {issue.wcag_rule} ({rule_context.get('name', 'Unknown')}) issue:

ISSUE: {issue.message}
ELEMENT: {issue.element}
CONTEXT: {context}
TEMPLATE: {fix_template}

Return JSON:
{{"fixed_element": "HTML_HERE", "explanation": "Brief fix description", "confidence": 0-100}}

Requirements:
- Maintain functionality
- Minimal changes
- Valid HTML
- WCAG compliant"""

        return prompt
    
    def fix_issue_batch(self, issues: List[AccessibilityIssue], html_content: str) -> List[FixResult]:
        """Process multiple issues in optimized batches"""
        results = []
        
        # Group issues by type for batch processing
        issue_groups = {}
        for issue in issues:
            if issue.type not in issue_groups:
                issue_groups[issue.type] = []
            issue_groups[issue.type].append(issue)
        
        # Process each group
        for issue_type, type_issues in issue_groups.items():
            if len(type_issues) <= 3:  # Small batch - process individually for accuracy
                for issue in type_issues:
                    result = self.fix_single_issue(issue, html_content)
                    results.append(result)
            else:  # Large batch - group process for efficiency
                batch_results = self.fix_issue_group(type_issues, html_content)
                results.extend(batch_results)
        
        return results
    
    def fix_single_issue(self, issue: AccessibilityIssue, html_content: str) -> FixResult:
        """Fix a single accessibility issue with optimized prompting"""
        try:
            context = self.analyze_element_context(issue.element, html_content)
            prompt = self.create_optimized_prompt(issue, context)
            
            response = self.model.generate_content(prompt)
            self.token_count += len(prompt.split()) + len(response.text.split())
            
            # Parse response
            try:
                result_data = json.loads(response.text.strip())
                return FixResult(
                    issue_id=issue.id,
                    fixed=True,
                    original_element=issue.element,
                    fixed_element=result_data.get("fixed_element", issue.element),
                    explanation=result_data.get("explanation", "Fixed by AI"),
                    confidence=float(result_data.get("confidence", 80)) / 100,
                    tokens_used=len(prompt.split()) + len(response.text.split())
                )
            except json.JSONDecodeError:
                # Fallback to rule-based fix
                return self.apply_rule_based_fix(issue)
                
        except Exception as e:
            print(f"Error fixing issue {issue.id}: {e}", file=sys.stderr)
            return self.apply_rule_based_fix(issue)
    
    def fix_issue_group(self, issues: List[AccessibilityIssue], html_content: str) -> List[FixResult]:
        """Fix multiple similar issues in one API call"""
        try:
            # Create batch prompt
            issue_data = []
            for i, issue in enumerate(issues):
                context = self.analyze_element_context(issue.element, html_content)
                issue_data.append({
                    "id": issue.id,
                    "element": issue.element,
                    "message": issue.message,
                    "context": context
                })
            
            prompt = f"""Fix {len(issues)} {issues[0].type} accessibility issues:

ISSUES: {json.dumps(issue_data, indent=None)}

Return JSON array:
[{{"id": "issue_id", "fixed_element": "HTML", "explanation": "Brief", "confidence": 0-100}}]

Requirements: Maintain functionality, minimal changes, valid HTML, WCAG compliant"""

            response = self.model.generate_content(prompt)
            self.token_count += len(prompt.split()) + len(response.text.split())
            
            # Parse batch response
            try:
                results_data = json.loads(response.text.strip())
                results = []
                
                for result_data in results_data:
                    issue = next((i for i in issues if i.id == result_data.get("id")), None)
                    if issue:
                        results.append(FixResult(
                            issue_id=issue.id,
                            fixed=True,
                            original_element=issue.element,
                            fixed_element=result_data.get("fixed_element", issue.element),
                            explanation=result_data.get("explanation", "Fixed by AI"),
                            confidence=float(result_data.get("confidence", 80)) / 100,
                            tokens_used=(len(prompt.split()) + len(response.text.split())) // len(issues)
                        ))
                
                return results
                
            except json.JSONDecodeError:
                # Fallback to individual processing
                return [self.apply_rule_based_fix(issue) for issue in issues]
                
        except Exception as e:
            print(f"Error in batch processing: {e}", file=sys.stderr)
            return [self.apply_rule_based_fix(issue) for issue in issues]
    
    def apply_rule_based_fix(self, issue: AccessibilityIssue) -> FixResult:
        """Apply rule-based fixes as fallback"""
        soup = BeautifulSoup(issue.element, 'html.parser')
        element = soup.find()
        
        if not element:
            return FixResult(
                issue_id=issue.id,
                fixed=False,
                original_element=issue.element,
                fixed_element=issue.element,
                explanation="Could not parse element",
                confidence=0.0,
                tokens_used=0
            )
        
        fixed = False
        explanation = "Applied rule-based fix"
        
        # Apply specific fixes based on issue type
        if issue.type == "alt-text":
            if not element.get('alt'):
                element['alt'] = "Image"  # Generic alt text
                fixed = True
                explanation = "Added generic alt text"
        
        elif issue.type == "heading":
            if "Multiple H1" in issue.message:
                if element.name == 'h1':
                    element.name = 'h2'
                    fixed = True
                    explanation = "Converted additional H1 to H2"
        
        elif issue.type == "focus":
            if "positive tabindex" in issue.message:
                element['tabindex'] = '0'
                fixed = True
                explanation = "Fixed tabindex value"
        
        elif issue.type == "aria":
            if "no accessible label" in issue.message.lower():
                if element.name == 'input':
                    input_type = element.get('type', 'text')
                    element['aria-label'] = f"{input_type.capitalize()} input"
                    fixed = True
                    explanation = "Added aria-label"
        
        elif issue.type == "keyboard":
            if "not keyboard accessible" in issue.message:
                element['tabindex'] = '0'
                element['role'] = 'button'
                fixed = True
                explanation = "Made keyboard accessible"
        
        return FixResult(
            issue_id=issue.id,
            fixed=fixed,
            original_element=issue.element,
            fixed_element=str(element),
            explanation=explanation,
            confidence=0.7 if fixed else 0.0,
            tokens_used=0
        )
    
    def apply_fixes_to_html(self, html_content: str, fix_results: List[FixResult]) -> str:
        """Apply all fixes to the HTML document"""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        for fix in fix_results:
            if not fix.fixed:
                continue
                
            try:
                # Find and replace the original element
                original_soup = BeautifulSoup(fix.original_element, 'html.parser')
                fixed_soup = BeautifulSoup(fix.fixed_element, 'html.parser')
                
                original_elem = original_soup.find()
                fixed_elem = fixed_soup.find()
                
                if original_elem and fixed_elem:
                    # Find matching element in document
                    matches = soup.find_all(original_elem.name)
                    for match in matches:
                        if self.elements_match(match, original_elem):
                            # Replace with fixed element
                            match.replace_with(fixed_elem)
                            break
                            
            except Exception as e:
                print(f"Error applying fix {fix.issue_id}: {e}", file=sys.stderr)
        
        return str(soup)
    
    def elements_match(self, elem1: Tag, elem2: Tag) -> bool:
        """Check if two elements are the same (fuzzy matching)"""
        if elem1.name != elem2.name:
            return False
        
        # Compare key attributes
        key_attrs = ['id', 'class', 'src', 'href', 'type']
        for attr in key_attrs:
            if elem1.get(attr) != elem2.get(attr):
                return False
        
        # Compare text content (first 50 chars)
        text1 = elem1.get_text()[:50].strip()
        text2 = elem2.get_text()[:50].strip()
        
        return text1 == text2

def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description='AI-powered accessibility fixer')
    parser.add_argument('--input', required=True, help='Input HTML file')
    parser.add_argument('--issues', required=True, help='Issues JSON file')
    parser.add_argument('--output', required=True, help='Output HTML file')
    parser.add_argument('--report', help='Fix report JSON file')
    
    args = parser.parse_args()
    
    # Load input files
    with open(args.input, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    with open(args.issues, 'r', encoding='utf-8') as f:
        issues_data = json.load(f)
    
    # Convert to AccessibilityIssue objects
    issues = []
    for issue_data in issues_data.get('issues', []):
        issues.append(AccessibilityIssue(
            id=issue_data['id'],
            type=issue_data['type'],
            severity=issue_data['severity'],
            message=issue_data['message'],
            element=issue_data['element'],
            element_path=issue_data.get('elementPath', ''),
            wcag_rule=issue_data.get('wcagRule', ''),
            suggestion=issue_data.get('suggestion', '')
        ))
    
    # Process fixes
    agent = AccessibilityAgent()
    print(f"Processing {len(issues)} accessibility issues...", file=sys.stderr)
    
    fix_results = agent.fix_issue_batch(issues, html_content)
    fixed_html = agent.apply_fixes_to_html(html_content, fix_results)
    
    # Save results
    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(fixed_html)
    
    # Generate report
    if args.report:
        report = {
            "total_issues": len(issues),
            "fixed_issues": len([f for f in fix_results if f.fixed]),
            "total_tokens_used": agent.token_count,
            "avg_confidence": sum(f.confidence for f in fix_results) / len(fix_results) if fix_results else 0,
            "fixes": [
                {
                    "issue_id": f.issue_id,
                    "fixed": f.fixed,
                    "explanation": f.explanation,
                    "confidence": f.confidence,
                    "tokens_used": f.tokens_used
                }
                for f in fix_results
            ]
        }
        
        with open(args.report, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
    
    print(f"Fixed {len([f for f in fix_results if f.fixed])}/{len(issues)} issues", file=sys.stderr)
    print(f"Total tokens used: {agent.token_count}", file=sys.stderr)

if __name__ == "__main__":
    main()

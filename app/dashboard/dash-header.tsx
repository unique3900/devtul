"use client"
import { ArrowRight, Shield } from 'lucide-react'
import React from 'react'
import { MegaMenu } from '@/components/mega-menu'
import { Button } from '@/components/ui/button'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const DashHeader = () => {
    const { data: session } = useSession()
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-7xl">
                <div className="flex items-center space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Devtul
                    </span>
                </div>

                <MegaMenu />

                {
                    session && session.jwtToken ? (
                        <div className="flex items-center space-x-4">
                            <Link href="/dashboard" className='bg-brand-gradient text-white px-4 py-2 rounded-md'>
                                Dashboard
                            </Link>
                            <Button variant="ghost" onClick={() => signOut({
                                callbackUrl: "/",
                            })}>Sign Out</Button>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-4">
                            <Link href="/login">
                                <Button variant="ghost">Sign In</Button>
                            </Link>
                            <Link href="/signup">
                                <Button className="bg-brand-gradient hover:bg-brand-gradient-r-hover hover:scale-105 transition-all duration-300 text-white px-4 py-2 rounded-md">
                                    Get Started
                                    <motion.div
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                                    >
                                        <ArrowRight className="ml-1 h-4 w-4" />
                                    </motion.div>
                                </Button>
                            </Link>
                        </div>
                    )
                }

            </div>
        </header>
    )
}

export default DashHeader
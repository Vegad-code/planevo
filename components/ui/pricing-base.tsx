'use client';

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from '@phosphor-icons/react'

export default function Pricing() {
    return (
        <section className="py-16 md:py-32 bg-background border-y-2 border-surface-900 relative overflow-hidden">
            <div className="mx-auto max-w-6xl px-6 relative z-10">
                <div className="mx-auto max-w-2xl space-y-6 text-center">
                    <h2 className="text-center text-4xl font-bold lg:text-5xl text-surface-900 uppercase tracking-tight">Pricing that Scales with You</h2>
                    <p className="text-surface-600 text-lg font-medium">Plant Pilot is evolving to be more than just a task list. It supports an entire ecosystem helping you focus and innovate.</p>
                </div>

                <div className="mt-12 grid gap-6 md:mt-20 md:grid-cols-3">
                    <Card className="flex flex-col bg-surface-100 border-2 border-surface-900 shadow-md text-surface-900">
                        <CardHeader>
                            <CardTitle className="font-bold text-surface-900 uppercase">Foundations</CardTitle>
                            <span className="my-3 block text-3xl font-bold text-surface-900">$0 <span className="text-lg font-bold text-surface-600">/ mo</span></span>
                            <CardDescription className="text-sm font-bold text-surface-600 uppercase">Forever free basics</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <hr className="border-t-2 border-surface-900" />

                            <ul className="list-outside space-y-3 text-sm text-surface-900 font-bold">
                                {['Basic task management', 'Standard Ollie coaching', '5 AI Flight Plans / mo', 'Community Support'].map((item, index) => (
                                    <li
                                        key={index}
                                        className="flex items-center gap-3">
                                        <Check weight="bold" className="size-5 text-accent-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>

                        <CardFooter className="mt-auto">
                            <Button
                                asChild
                                variant="outline"
                                className="w-full uppercase font-bold">
                                <Link href="/signup">Get Started</Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="relative flex flex-col bg-surface-100 border-2 border-surface-900 text-surface-900 shadow-md">
                        <CardHeader>
                            <CardTitle className="font-bold text-surface-900 uppercase">Personal Pilot</CardTitle>
                            <span className="my-3 block text-3xl font-bold text-surface-900">$9.99 <span className="text-lg font-bold text-surface-600">/ mo</span></span>
                            <CardDescription className="text-sm font-bold text-surface-600 uppercase">For daily organization</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <hr className="border-t-2 border-surface-900" />
                            <ul className="list-outside space-y-3 text-sm text-surface-900 font-bold">
                                {['Everything in Foundations', 'Unlimited AI Flight Plans', 'Full Google Calendar Sync', 'Smart No-Shame Rollover', 'Habit Automation'].map((item, index) => (
                                    <li
                                        key={index}
                                        className="flex items-center gap-3">
                                        <Check weight="bold" className="size-5 text-accent-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>

                        <CardFooter className="mt-auto">
                            <Button
                                asChild
                                variant="outline"
                                className="w-full uppercase font-bold">
                                <Link href="/signup">Upgrade Now</Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="relative flex flex-col bg-surface-200 border-2 border-surface-900 text-surface-900 shadow-xl -translate-y-2">
                        <span className="absolute inset-x-0 -top-4 mx-auto flex h-8 w-fit items-center bg-surface-900 px-4 py-1 text-sm font-bold text-surface-100 uppercase tracking-widest border-2 border-surface-900 shadow-sm animate-pulse">Elite Founder</span>

                        <CardHeader className="pt-8">
                            <CardTitle className="font-bold text-surface-900 uppercase">Elite Pilot</CardTitle>
                            <div className="flex flex-col">
                                <span className="my-1 block text-3xl font-bold text-surface-900">$23.99 <span className="text-lg font-bold text-surface-600">/ mo</span></span>
                                <span className="text-xs font-black text-accent-600 uppercase tracking-tighter">
                                    $19.99/mo for first 3 months
                                </span>
                            </div>
                            <CardDescription className="text-sm font-bold text-surface-600 uppercase mt-2">Executive AI Assistant</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <hr className="border-t-2 border-surface-900" />
                            <ul className="list-outside space-y-3 text-sm text-surface-900 font-bold">
                                {[
                                    'Everything in Personal Plan', 
                                    'AI Command Center (Ollie Agent)', 
                                    'Agentic Actions (Ollie acts for you)', 
                                    'Advanced GPT-4o Reasoning', 
                                    'Weekly Performance Audits',
                                    'Custom Ollie Personas',
                                    'Priority Support'
                                ].map((item, index) => (
                                    <li
                                        key={index}
                                        className="flex items-center gap-3">
                                        <Check weight="bold" className="size-5 text-accent-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>

                        <CardFooter className="mt-auto">
                            <Button
                                asChild
                                className="w-full uppercase font-bold text-base bg-surface-900 text-surface-100 hover:bg-surface-800">
                                <Link href="/signup">Claim Offer</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </section>
    )
}

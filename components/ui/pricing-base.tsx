'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Warning } from '@phosphor-icons/react';

export default function Pricing() {
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Basic detection for App Store compliance
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
            setIsIOS(true);
        }
    }, []);

    const tiers = [
        {
            name: 'Standard Pilot',
            price: '$0',
            description: 'The Foundation',
            features: [
                'Unified Dashboard',
                'Manual Canvas & Google Sync',
                'Basic Task Management',
                '3 AI Tactical Requests / day'
            ],
            buttonText: 'Get Started',
            href: '/signup',
            highlight: false
        },
        {
            name: 'Flight Pilot (Pro)',
            price: '$9.99',
            description: 'The Self-Driving Planner',
            features: [
                'Everything in Standard',
                'Real-time Auto-Sync',
                '50 AI Tactical Requests / day',
                'Smart No-Shame Rollover',
                'Advanced Focus Tools'
            ],
            buttonText: 'Upgrade Now',
            href: '/signup',
            highlight: false
        },
        {
            name: 'Elite Squadron',
            price: '$23.99',
            description: 'The Autonomous Assistant',
            features: [
                'Everything in Flight Pilot',
                '200 AI Tactical Requests / day',
                'Goal Architect (AI Breakdown)',
                'Agentic Command (Ollie acts)',
                'Weekly Flight Audits',
                'Custom Ollie Personas'
            ],
            buttonText: 'Join Elite',
            href: '/signup',
            highlight: true,
            badge: 'MOST POPULAR'
        }
    ];

    return (
        <section className="py-16 md:py-32 bg-background border-y-2 border-surface-900 relative overflow-hidden">
            <div className="mx-auto max-w-6xl px-6 relative z-10">
                <div className="mx-auto max-w-2xl space-y-6 text-center">
                    <h2 className="text-center text-4xl font-bold lg:text-5xl text-surface-900 uppercase tracking-tight">Tactical Pricing</h2>
                    <p className="text-surface-600 text-lg font-medium">Choose your clearance level. Every tier is protected by our automated security shield.</p>
                </div>

                {isIOS && (
                    <div className="mt-8 p-4 bg-accent-50 border-2 border-accent-200 rounded-xl flex items-center gap-3 text-accent-900 font-bold text-xs uppercase max-w-xl mx-auto">
                        <Warning size={24} weight="fill" />
                        <p>iOS User: Plans are managed via your web dashboard to ensure full platform compatibility.</p>
                    </div>
                )}

                <div className="mt-12 grid gap-6 md:mt-20 md:grid-cols-3">
                    {tiers.map((tier) => (
                        <Card 
                            key={tier.name}
                            className={`flex flex-col border-2 border-surface-900 shadow-md transition-all hover:scale-[1.02] ${
                                tier.highlight 
                                ? 'bg-surface-200 shadow-xl -translate-y-2 relative' 
                                : 'bg-surface-100'
                            }`}
                        >
                            {tier.badge && (
                                <span className="absolute inset-x-0 -top-4 mx-auto flex h-8 w-fit items-center bg-surface-900 px-4 py-1 text-sm font-bold text-surface-100 uppercase tracking-widest border-2 border-surface-900 shadow-sm">
                                    {tier.badge}
                                </span>
                            )}

                            <CardHeader className={tier.badge ? 'pt-8' : ''}>
                                <CardTitle className="font-bold text-surface-900 uppercase">{tier.name}</CardTitle>
                                {!isIOS && (
                                    <span className="my-3 block text-3xl font-black text-surface-900">
                                        {tier.price} <span className="text-lg font-bold text-surface-600">/ mo</span>
                                    </span>
                                )}
                                <CardDescription className="text-sm font-bold text-surface-600 uppercase">{tier.description}</CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <hr className="border-t-2 border-surface-900" />
                                <ul className="list-outside space-y-3 text-sm text-surface-900 font-bold">
                                    {tier.features.map((feature, index) => (
                                        <li key={index} className="flex items-center gap-3">
                                            <Check weight="bold" className="size-5 text-accent-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter className="mt-auto">
                                {!isIOS ? (
                                    <Button
                                        asChild
                                        className={`w-full uppercase font-black tracking-widest ${
                                            tier.highlight 
                                            ? 'bg-surface-900 text-surface-100 hover:bg-surface-800' 
                                            : 'bg-white text-surface-900 border-2 border-surface-900 hover:bg-surface-900 hover:text-white'
                                        }`}
                                    >
                                        <Link href={tier.href}>{tier.buttonText}</Link>
                                    </Button>
                                ) : (
                                    <div className="w-full text-center py-3 text-[10px] font-black uppercase text-surface-400 border-2 border-dashed border-surface-300 rounded-lg">
                                        Manage on Web
                                    </div>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check, Warning, X, Lightning, GraduationCap, Briefcase, CaretDown } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1, transition: { staggerChildren: 0.1 } },
  viewport: { once: true }
};

const notionComparison = [
  { feature: 'Canvas LMS Auto-Sync', us: true, notion: false },
  { feature: 'Google Calendar Auto-Sync', us: true, notion: false },
  { feature: 'AI Flight Plan (Daily Schedule)', us: true, notion: false },
  { feature: 'No-Shame Rollover System', us: true, notion: false },
  { feature: 'Academic Search (AI)', us: 'Pro', notion: '$20/mo' },
  { feature: 'AI Meeting / Lecture Notes', us: 'Pro', notion: '$20/mo' },
  { feature: 'Agentic AI Actions', us: 'Elite', notion: '$20/mo' },
  { feature: 'GitHub / Slack / Jira Sync', us: 'Elite', notion: '$20/mo' },
  { feature: 'Price to unlock all above', us: '$14.99', notion: '$20.00+' },
];

export default function Pricing() {
    const [isIOS, setIsIOS] = useState(false);
    const [showCompare, setShowCompare] = useState(false);

    useEffect(() => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
            setIsIOS(true);
        }
    }, []);

    const tiers = [
        {
            name: 'Standard Pilot',
            price: '$0',
            period: '/ mo',
            description: 'Your launchpad. Clear for takeoff.',
            icon: <GraduationCap weight="bold" className="size-6" />,
            features: [
                'Unified Dashboard (Command Center)',
                'Canvas & Google Auto-Sync',
                'No-Shame Rollover System',
                'Basic Task Management',
                '5 AI Tactical Requests / day',
            ],
            limitations: [
                'No Academic Search',
                'No Professional Integrations',
            ],
            buttonText: 'Get Started Free',
            href: '/signup',
            highlight: false,
            badge: null,
            color: 'bg-brand-100',
        },
        {
            name: 'Flight Pilot',
            price: '$7.99',
            period: '/ mo',
            description: 'The self-driving academic assistant.',
            icon: <Lightning weight="bold" className="size-6" />,
            features: [
                'Everything in Standard',
                'Real-time Auto-Sync (15 min)',
                '100 AI Tactical Requests / day',
                'Academic Search (AI-powered)',
                'Lecture AI Summaries',
                'Zotero & Google Drive Sync',
                'Smart Focus Mode',
            ],
            limitations: [],
            buttonText: 'Upgrade to Flight',
            href: '/signup',
            highlight: false,
            badge: 'RECOMMENDED',
            badgeColor: 'bg-accent-500 text-surface-900',
            color: 'bg-accent-50',
        },
        {
            name: 'Elite Squadron',
            price: '$14.99',
            period: '/ mo',
            description: 'Full autonomy. Ollie acts for you.',
            icon: <Briefcase weight="bold" className="size-6" />,
            features: [
                'Everything in Flight Pilot',
                '1000 AI Requests / day (Unlimited)',
                'Agentic Command (Ollie acts)',
                'GitHub, Slack & Jira Sync',
                'Goal Architect (AI Breakdown)',
                'Weekly Flight Audits',
                'Custom Ollie Personas',
                'Priority Support',
            ],
            limitations: [],
            buttonText: 'Join Elite',
            href: '/signup',
            highlight: true,
            badge: 'MAX POWER',
            badgeColor: 'bg-surface-900 text-surface-100',
            color: 'bg-surface-900',
        },
    ];

    return (
        <section id="pricing" className="py-24 md:py-32 bg-background border-y-2 border-surface-900 relative overflow-hidden">
            <div className="mx-auto max-w-6xl px-6 relative z-10">
                {/* Header */}
                <motion.div 
                    className="mx-auto max-w-2xl space-y-6 text-center mb-20"
                    {...fadeInUp}
                >
                    <div className="inline-flex items-center gap-2 bg-accent-100 border-2 border-accent-500 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-accent-700 rounded-full">
                        <Lightning weight="fill" className="size-3" />
                        Flight Clearance
                    </div>
                    <h2 className="text-4xl font-black lg:text-7xl text-surface-900 uppercase tracking-tighter leading-none">
                        Simple Tiers.<br />Serious Power.
                    </h2>
                    <p className="text-surface-600 text-xl font-bold leading-relaxed">
                        Choose the level of autonomy that fits your semester. No hidden fees, no complexity. Just clarity.
                    </p>
                </motion.div>

                {isIOS && (
                    <motion.div 
                        className="mt-8 p-6 bg-accent-50 border-2 border-accent-200 rounded-2xl flex items-center gap-4 text-accent-900 font-bold text-sm uppercase max-w-xl mx-auto mb-12 shadow-[4px_4px_0_0_var(--accent-200)]"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Warning size={32} weight="fill" className="shrink-0" />
                        <p>iOS User: Plans are managed via our web dashboard for full cross-platform capability.</p>
                    </motion.div>
                )}

                {/* Tier Cards */}
                <motion.div 
                    className="grid gap-8 md:grid-cols-3 items-stretch"
                    variants={staggerContainer}
                    initial="initial"
                    whileInView="whileInView"
                    viewport={{ once: true }}
                >
                    {tiers.map((tier) => (
                        <motion.div
                            key={tier.name}
                            className={`relative flex flex-col border-4 border-surface-900 rounded-[2rem] overflow-hidden transition-all ${
                                tier.highlight
                                    ? 'bg-surface-900 text-surface-100 shadow-[12px_12px_0_0_var(--accent-500)]'
                                    : 'bg-surface-100 shadow-[8px_8px_0_0_var(--surface-900)]'
                            }`}
                            variants={fadeInUp}
                            whileHover={{ 
                                y: -15, 
                                shadow: tier.highlight 
                                    ? "15px 15px 0 0 var(--accent-500)" 
                                    : "12px 12px 0 0 var(--surface-900)" 
                            }}
                        >
                            {/* Badge */}
                            {tier.badge && (
                                <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-2xl text-[10px] font-black uppercase tracking-[0.2em] border-l-4 border-b-4 border-surface-900 z-20 ${tier.badgeColor}`}>
                                    {tier.badge}
                                </div>
                            )}

                            <div className="p-10 flex-1">
                                {/* Icon + Name */}
                                <div className={`flex items-center gap-3 mb-6 ${tier.highlight ? 'text-accent-400' : 'text-accent-500'}`}>
                                    <div className={`p-3 rounded-xl border-2 border-surface-900 ${tier.highlight ? 'bg-surface-800' : 'bg-white'}`}>
                                        {tier.icon}
                                    </div>
                                    <span className={`font-black uppercase tracking-tight text-xl ${tier.highlight ? 'text-surface-100' : 'text-surface-900'}`}>{tier.name}</span>
                                </div>

                                {/* Price */}
                                {!isIOS && (
                                    <div className="mb-4">
                                        <span className={`text-6xl font-black tracking-tighter ${tier.highlight ? 'text-surface-100' : 'text-surface-900'}`}>{tier.price}</span>
                                        <span className={`text-xl font-bold ml-2 ${tier.highlight ? 'text-surface-400' : 'text-surface-500'}`}>{tier.period}</span>
                                    </div>
                                )}

                                <p className={`text-sm font-bold uppercase mb-8 tracking-wide ${tier.highlight ? 'text-surface-400' : 'text-surface-600'}`}>{tier.description}</p>

                                <div className={`h-1 w-12 mb-8 rounded-full ${tier.highlight ? 'bg-surface-700' : 'bg-surface-200'}`} />

                                {/* Features */}
                                <ul className="space-y-4 mb-10">
                                    {tier.features.map((feature, index) => (
                                        <motion.li 
                                            key={index} 
                                            className="flex items-start gap-3 text-sm font-black uppercase tracking-tight"
                                            initial={{ opacity: 0, x: -10 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 border-surface-900 ${tier.highlight ? 'bg-accent-500 text-surface-900' : 'bg-accent-100 text-accent-700'}`}>
                                                <Check weight="bold" className="size-3" />
                                            </div>
                                            <span className={tier.highlight ? 'text-surface-100' : 'text-surface-900'}>{feature}</span>
                                        </motion.li>
                                    ))}
                                    {tier.limitations.map((limitation, index) => (
                                        <li key={`lim-${index}`} className="flex items-start gap-3 text-sm font-black uppercase tracking-tight opacity-30 italic">
                                            <div className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 border-surface-900 bg-surface-200 text-surface-400">
                                                <X weight="bold" className="size-3" />
                                            </div>
                                            <span className={tier.highlight ? 'text-surface-400' : 'text-surface-500'}>{limitation}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* CTA */}
                            <div className="p-10 pt-0 mt-auto">
                                {!isIOS ? (
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Link
                                            href={tier.href}
                                            className={`flex items-center justify-center w-full py-5 text-base font-black uppercase tracking-[0.15em] border-4 transition-all rounded-2xl ${
                                                tier.highlight
                                                    ? 'bg-accent-500 text-surface-900 border-surface-900 hover:bg-accent-400 shadow-[6px_6px_0_0_var(--surface-500)]'
                                                    : 'bg-surface-900 text-surface-100 border-surface-900 hover:bg-surface-800 shadow-[6px_6px_0_0_var(--accent-500)]'
                                            }`}
                                        >
                                            {tier.buttonText}
                                        </Link>
                                    </motion.div>
                                ) : (
                                    <div className="w-full text-center py-5 text-xs font-black uppercase text-surface-400 border-4 border-dashed border-surface-300 rounded-2xl">
                                        Manage on Web Dashboard
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Compare vs Notion Toggle */}
                <div className="mt-24 text-center">
                    <button
                        onClick={() => setShowCompare(!showCompare)}
                        className="group inline-flex flex-col items-center gap-3 text-sm font-black uppercase tracking-widest text-surface-400 hover:text-surface-900 transition-all"
                    >
                        <span>How we compare to the "Ground" apps</span>
                        <motion.div 
                            className="p-3 rounded-full border-2 border-surface-200 group-hover:border-surface-900 group-hover:bg-surface-100"
                            animate={{ rotate: showCompare ? 180 : 0 }}
                        >
                            <CaretDown weight="bold" className="size-5" />
                        </motion.div>
                    </button>
                </div>

                <AnimatePresence>
                    {showCompare && (
                        <motion.div 
                            className="mt-12 border-4 border-surface-900 overflow-hidden shadow-[12px_12px_0_0_var(--shadow-color)] rounded-[2.5rem] bg-white"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: "circOut" }}
                        >
                            <div className="bg-surface-900 text-surface-100 px-10 py-6 flex items-center justify-between">
                                <span className="font-black uppercase tracking-[0.2em] text-sm">Automated Pilot vs. Passive Workspace</span>
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-accent-500" />
                                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                                    <div className="w-2 h-2 rounded-full bg-success" />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-surface-50 border-b-4 border-surface-900">
                                            <th className="text-left px-10 py-6 font-black uppercase text-xs text-surface-400 tracking-widest">Efficiency Benchmark</th>
                                            <th className="text-center px-10 py-6 font-black uppercase text-sm text-surface-900 tracking-tighter">🦉 Plan Pilot</th>
                                            <th className="text-center px-10 py-6 font-black uppercase text-sm text-surface-400 tracking-tighter italic">Notion</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-surface-100">
                                        {notionComparison.map((row, i) => (
                                            <tr key={i} className="hover:bg-accent-50/30 transition-colors">
                                                <td className="px-10 py-5 font-black text-surface-900 uppercase tracking-tight text-xs">{row.feature}</td>
                                                <td className="px-10 py-5 text-center">
                                                    {row.us === true ? (
                                                        <div className="w-8 h-8 bg-accent-100 text-accent-700 rounded-lg flex items-center justify-center mx-auto border-2 border-accent-200">
                                                            <Check weight="bold" className="size-4" />
                                                        </div>
                                                    ) : (
                                                        <span className="font-black text-[10px] text-accent-700 bg-accent-50 px-3 py-1 border-2 border-accent-200 rounded-full">{row.us}</span>
                                                    )}
                                                </td>
                                                <td className="px-10 py-5 text-center">
                                                    {row.notion === false ? (
                                                        <div className="w-8 h-8 bg-surface-100 text-surface-300 rounded-lg flex items-center justify-center mx-auto border-2 border-surface-200">
                                                            <X weight="bold" className="size-4" />
                                                        </div>
                                                    ) : (
                                                        <span className="font-black text-[10px] text-surface-400 bg-surface-50 px-3 py-1 border-2 border-surface-200 rounded-full">{row.notion}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-accent-500 border-t-4 border-surface-900 px-10 py-6 text-center">
                                <p className="font-black uppercase text-base text-surface-900 tracking-tight">The Decision is Simple: Why pay more for a manual workspace? 🚀</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}

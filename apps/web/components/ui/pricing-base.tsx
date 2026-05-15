'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Warning, Lightning, CaretDown, Student, CircleNotch } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { redirectToCheckout } from '@/hooks/use-subscription';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: "easeOut" as any }
};

export default function Pricing() {
    const [isIOS, setIsIOS] = useState(false);
    const [isAnnual, setIsAnnual] = useState(true);
    const [showStudent, setShowStudent] = useState(false);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
            requestAnimationFrame(() => {
                setIsIOS(true);
            });
        }
    }, []);

    const handleCheckout = async () => {
        setIsCheckoutLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // User is logged in, send them straight to Stripe
                await redirectToCheckout(isAnnual ? 'annual' : 'monthly');
            } else {
                // User is not logged in, send them to signup first
                router.push('/signup');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            setIsCheckoutLoading(false);
        }
    };

    const features = [
        'Unified Daily Plan & Calendar',
        'Canvas & Google Auto-Sync',
        'No-Shame Rollover System',
        'Unlimited Ollie AI Assistant',
        'Smart Focus Tools',
        'Priority Support'
    ];

    return (
        <section id="pricing" className="py-24 md:py-32 bg-background border-y-2 border-surface-900 relative overflow-hidden">
            <div className="mx-auto max-w-6xl px-6 relative z-10">
                {/* Header */}
                <motion.div 
                    className="mx-auto max-w-2xl space-y-6 text-center mb-16"
                    {...fadeInUp}
                >
                    <div className="inline-flex items-center gap-2 bg-accent-100 border-2 border-accent-500 px-4 py-1.5 text-accent-700 rounded-full text-meta">
                        <Lightning weight="fill" className="size-3" />
                        One Membership
                    </div>
                    <h2 className="text-h2 text-surface-900 leading-none">
                        Everything you need.<br />One simple price.
                    </h2>
                    <p className="text-body text-surface-600">
                        No confusing tiers. No hidden limits. Just a clear path to a calmer academic life.
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

                {/* Billing Toggle */}
                <motion.div 
                    className="flex justify-center mb-12"
                    {...fadeInUp}
                >
                    <div className="relative inline-flex items-center p-1 bg-surface-100 border-4 border-surface-900 rounded-full shadow-[6px_6px_0_0_var(--surface-900)] w-full max-w-sm">
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={`relative flex-1 py-3 transition-colors z-10 text-meta ${
                                !isAnnual ? 'text-white' : 'text-surface-500 hover:text-surface-900'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={`relative flex-1 py-3 transition-colors z-10 flex items-center justify-center gap-2 text-meta ${
                                isAnnual ? 'text-white' : 'text-surface-500 hover:text-surface-900'
                            }`}
                        >
                            Annual
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors ${isAnnual ? 'bg-white/20 text-white' : 'bg-success text-white'}`}>Save 34%</span>
                        </button>
                        
                        {/* Active Pill Animation */}
                        <motion.div
                            className="absolute top-1 bottom-1 bg-surface-900 rounded-full z-0"
                            initial={false}
                            animate={{ 
                                left: isAnnual ? '50%' : '4px',
                                right: isAnnual ? '4px' : '50%',
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        />
                    </div>
                </motion.div>

                {/* Single Pricing Card */}
                <motion.div 
                    className="max-w-2xl mx-auto relative flex flex-col md:flex-row border-4 border-surface-900 rounded-[2rem] overflow-hidden bg-white shadow-[12px_12px_0_0_var(--accent-500)]"
                    variants={fadeInUp}
                    whileHover={{ y: -5, boxShadow: "16px 16px 0 0 var(--accent-500)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                    {/* Left Side - Price & CTA */}
                    <div className="p-10 md:w-1/2 bg-surface-50 border-b-4 md:border-b-0 md:border-r-4 border-surface-900 flex flex-col justify-center">
                        <div className="mb-2">
                            <span className="text-surface-900 text-meta">Plan Pilot Pro</span>
                        </div>
                        
                        <div className="mb-8 min-h-[6rem]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={isAnnual ? 'annual' : 'monthly'}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex items-baseline gap-1"
                                >
                                    <span className="text-7xl font-black tracking-tighter text-surface-900">
                                        ${isAnnual ? '6.58' : '9.99'}
                                    </span>
                                    <span className="text-xl font-bold text-surface-500">
                                        /mo
                                    </span>
                                </motion.div>
                            </AnimatePresence>
                            {isAnnual && (
                                <motion.p 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-success text-meta mt-2"
                                >
                                    Billed annually at $79/year
                                </motion.p>
                            )}
                        </div>

                        {!isIOS ? (
                            <div className="space-y-4 mt-auto">
                                <button
                                    onClick={handleCheckout}
                                    disabled={isCheckoutLoading}
                                    className="flex items-center justify-center gap-2 w-full py-6 border-4 transition-all rounded-[1.5rem] bg-accent-500 text-surface-900 border-surface-900 hover:bg-accent-400 shadow-[8px_8px_0_0_var(--surface-900)] active:translate-y-1 active:shadow-none disabled:opacity-50 text-sm font-black uppercase tracking-widest px-4"
                                >
                                    {isCheckoutLoading ? (
                                        <CircleNotch weight="bold" className="size-6 animate-spin" />
                                    ) : (
                                        'Start 14-Day Free Trial'
                                    )}
                                </button>
                                <p className="text-center text-surface-900 font-bold text-xs uppercase tracking-tight">
                                    Card required. Cancel anytime.
                                </p>
                            </div>
                        ) : (
                            <div className="w-full text-center py-5 text-xs font-black uppercase text-surface-400 border-4 border-dashed border-surface-300 rounded-2xl mt-auto">
                                Manage on Web Dashboard
                            </div>
                        )}
                    </div>

                    {/* Right Side - Features */}
                    <div className="p-10 md:w-1/2 bg-white flex flex-col justify-center">
                        <p className="mb-8 text-surface-400 text-meta">Everything Included</p>
                        <ul className="space-y-5">
                            {features.map((feature, index) => (
                                <motion.li 
                                    key={index} 
                                    className="flex items-start gap-3 text-meta"
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <div className="mt-0 w-6 h-6 rounded-md flex items-center justify-center shrink-0 border-2 border-surface-900 bg-accent-100 text-surface-900">
                                        <Check weight="bold" className="size-3.5" />
                                    </div>
                                    <span className="text-surface-900 leading-snug pt-0.5">{feature}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </div>
                </motion.div>

                {/* Student Discount Toggle */}
                <div className="mt-16 text-center">
                    <button
                        onClick={() => setShowStudent(!showStudent)}
                        className="group inline-flex flex-col items-center gap-3 text-sm font-black uppercase tracking-widest text-surface-400 hover:text-surface-900 transition-all"
                    >
                        <span className="flex items-center gap-2">
                            <Student weight="bold" className="size-5" />
                            Are you a verified student?
                        </span>
                        <motion.div 
                            className="p-2 rounded-full border-2 border-surface-200 group-hover:border-surface-900 group-hover:bg-surface-100"
                            animate={{ rotate: showStudent ? 180 : 0 }}
                        >
                            <CaretDown weight="bold" className="size-4" />
                        </motion.div>
                    </button>
                </div>

                <AnimatePresence>
                    {showStudent && (
                        <motion.div 
                            className="mt-8 max-w-xl mx-auto border-4 border-surface-900 overflow-hidden shadow-[8px_8px_0_0_var(--surface-900)] rounded-2xl bg-brand-50 p-8 text-center"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "circOut" }}
                        >
                            <h4 className="font-black uppercase text-xl text-surface-900 mb-2 tracking-tighter">Student Discount</h4>
                            <p className="text-surface-700 font-bold mb-6 text-sm">
                                Verify your .edu email during checkout to unlock Plan Pilot Pro for just <strong className="text-surface-900 font-black">$4.99/mo</strong>.
                            </p>
                            <Link href="/signup?student=true" className="inline-block border-2 border-surface-900 bg-white text-surface-900 font-black uppercase text-xs tracking-widest px-6 py-3 rounded-xl hover:bg-surface-100 transition-colors shadow-[4px_4px_0_0_var(--surface-900)] active:translate-y-1 active:shadow-none">
                                Claim Student Rate
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}

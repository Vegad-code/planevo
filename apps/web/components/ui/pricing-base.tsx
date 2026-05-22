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
        'Unlimited Bruno AI Assistant',
        'Smart Focus Tools',
        'Priority Support'
    ];

    return (
        <section id="pricing" className="py-24 md:py-32 bg-[var(--color-paper)] border-y border-[var(--color-line)] relative overflow-hidden">
            <div className="mx-auto max-w-6xl px-6 relative z-10">
                {/* Header */}
                <motion.div 
                    className="mx-auto max-w-2xl space-y-6 text-center mb-16"
                    {...fadeInUp}
                >
                    <div className="inline-flex items-center gap-2 bg-[var(--color-honey-soft)] border border-[var(--color-honey)] px-4 py-1.5 text-[var(--color-honey-deep)] rounded-full font-mono text-xs uppercase tracking-widest font-semibold">
                        <Lightning weight="fill" className="size-3" />
                        One Membership
                    </div>
                    <h2 className="text-5xl md:text-7xl font-serif font-bold text-[var(--color-ink)] leading-[0.9] tracking-tight">
                        Everything you need.<br />One simple price.
                    </h2>
                    <p className="text-lg font-sans text-[var(--color-ink-soft)] max-w-lg mx-auto">
                        No confusing tiers. No hidden limits. Just a clear path to a calmer academic life.
                    </p>
                </motion.div>

                {isIOS && (
                    <motion.div 
                        className="mt-8 p-6 bg-[var(--color-rose-soft)] border border-[var(--color-rose)] rounded-2xl flex items-center gap-4 text-[var(--color-ink-2)] font-mono font-medium text-xs uppercase max-w-xl mx-auto mb-12 shadow-sm"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Warning size={32} weight="fill" className="shrink-0 text-[var(--color-rose)]" />
                        <p>iOS User: Plans are managed via our web dashboard for full cross-platform capability.</p>
                    </motion.div>
                )}

                {/* Billing Toggle */}
                <motion.div 
                    className="flex justify-center mb-12"
                    {...fadeInUp}
                >
                    <div className="relative inline-flex items-center p-1 bg-[var(--color-cream-2)] border border-[var(--color-line)] rounded-full shadow-sm w-full max-w-sm">
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={`relative flex-1 py-3 transition-colors z-10 font-mono text-xs uppercase tracking-widest font-bold ${
                                !isAnnual ? 'text-[var(--color-cream)]' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={`relative flex-1 py-3 transition-colors z-10 flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest font-bold ${
                                isAnnual ? 'text-[var(--color-cream)]' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                            }`}
                        >
                            Annual
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-colors ${isAnnual ? 'bg-[var(--color-cream)]/20 text-[var(--color-cream)]' : 'bg-[var(--color-sage)] text-[var(--color-cream)]'}`}>Save 34%</span>
                        </button>
                        
                        {/* Active Pill Animation */}
                        <motion.div
                            className="absolute top-1 bottom-1 bg-[var(--color-ink)] rounded-full z-0"
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
                    className="max-w-2xl mx-auto relative flex flex-col md:flex-row border border-[var(--color-line)] rounded-3xl overflow-hidden bg-[var(--color-paper)] shadow-xl"
                    variants={fadeInUp}
                    whileHover={{ y: -5, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                    {/* Left Side - Price & CTA */}
                    <div className="p-10 md:w-1/2 bg-[var(--color-cream)] border-b md:border-b-0 md:border-r border-[var(--color-line)] flex flex-col justify-center">
                        <div className="mb-2">
                            <span className="text-[var(--color-ink)] font-mono text-xs uppercase tracking-widest font-semibold">Planevo Pro</span>
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
                                    <span className="text-6xl font-serif font-bold tracking-tight text-[var(--color-ink)]">
                                        ${isAnnual ? '6.58' : '9.99'}
                                    </span>
                                    <span className="text-lg font-sans font-medium text-[var(--color-ink-soft)]">
                                        /mo
                                    </span>
                                </motion.div>
                            </AnimatePresence>
                            {isAnnual && (
                                <motion.p 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[var(--color-sage)] font-mono text-xs font-medium uppercase tracking-widest mt-2"
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
                                    className="flex items-center justify-center gap-2 w-full py-5 transition-all rounded-full bg-[var(--color-ink)] text-[var(--color-cream)] border-none hover:bg-[var(--color-ink-2)] shadow-none active:scale-[0.98] disabled:opacity-50 text-xs font-mono font-bold uppercase tracking-widest px-4"
                                >
                                    {isCheckoutLoading ? (
                                        <CircleNotch weight="bold" className="size-5 animate-spin" />
                                    ) : (
                                        'Start 14-Day Free Trial'
                                    )}
                                </button>
                                <p className="text-center text-[var(--color-ink-soft)] font-mono text-[10px] uppercase tracking-widest font-medium">
                                    Card required. Cancel anytime.
                                </p>
                            </div>
                        ) : (
                            <div className="w-full text-center py-5 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--color-ink-faint)] border border-dashed border-[var(--color-line-strong)] rounded-full mt-auto">
                                Manage on Web Dashboard
                            </div>
                        )}
                    </div>

                    {/* Right Side - Features */}
                    <div className="p-10 md:w-1/2 bg-[var(--color-paper)] flex flex-col justify-center">
                        <p className="mb-6 text-[var(--color-ink-soft)] font-mono text-xs font-semibold uppercase tracking-widest">Everything Included</p>
                        <ul className="space-y-4">
                            {features.map((feature, index) => (
                                <motion.li 
                                    key={index} 
                                    className="flex items-start gap-3"
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <div className="mt-0 w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-[var(--color-sage-soft)] text-[var(--color-sage)]">
                                        <Check weight="bold" className="size-3" />
                                    </div>
                                    <span className="text-[var(--color-ink-2)] font-sans text-sm leading-snug pt-0.5 font-medium">{feature}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </div>
                </motion.div>

                {/* Student Discount Toggle */}
                <div className="mt-16 text-center">
                    <button
                        onClick={() => setShowStudent(!showStudent)}
                        className="group inline-flex flex-col items-center gap-3 text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-all"
                    >
                        <span className="flex items-center gap-2">
                            <Student weight="bold" className="size-4" />
                            Are you a verified student?
                        </span>
                        <motion.div 
                            className="p-1.5 rounded-full border border-[var(--color-line)] group-hover:border-[var(--color-ink)] group-hover:bg-[var(--color-cream-2)]"
                            animate={{ rotate: showStudent ? 180 : 0 }}
                        >
                            <CaretDown weight="bold" className="size-3" />
                        </motion.div>
                    </button>
                </div>

                <AnimatePresence>
                    {showStudent && (
                        <motion.div 
                            className="mt-6 max-w-xl mx-auto border border-[var(--color-line)] overflow-hidden shadow-sm rounded-2xl bg-[var(--color-cream-2)] p-8 text-center"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "circOut" }}
                        >
                            <h4 className="font-serif font-bold text-2xl text-[var(--color-ink)] mb-2 tracking-tight">Student Discount</h4>
                            <p className="text-[var(--color-ink-soft)] font-sans mb-6 text-sm">
                                Verify your .edu email during checkout to unlock Planevo Pro for just <strong className="text-[var(--color-ink)] font-bold">$4.99/mo</strong>.
                            </p>
                            <Link href="/signup?student=true" className="inline-block bg-[var(--color-paper)] border border-[var(--color-line)] text-[var(--color-ink)] font-mono font-bold uppercase text-[10px] tracking-widest px-6 py-3 rounded-full hover:bg-[var(--color-cream)] transition-colors shadow-sm active:scale-95">
                                Claim Student Rate
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}

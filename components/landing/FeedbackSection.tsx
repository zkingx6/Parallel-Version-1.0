"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, MessageCircle } from "lucide-react";
import { submitFeedback, type FeedbackType } from "@/lib/feedback";

const quickTags: { emoji: string; label: string; type: FeedbackType }[] = [
  { emoji: "👍", label: "Love it", type: "love_it" },
  { emoji: "🤔", label: "Confusing", type: "confusing" },
  { emoji: "🐞", label: "Found a bug", type: "bug" },
  { emoji: "💡", label: "I have an idea", type: "idea" },
];

export function FeedbackSection() {
  const [activeTag, setActiveTag] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await submitFeedback({
      type: activeTag ?? "general",
      source: "landing_page",
      message: message.trim(),
      email: email.trim() || undefined,
    });
    setSubmitting(false);
    if (result.success) {
      setSubmitted(true);
    } else {
      setSubmitError(result.error);
    }
  };

  return (
    <section className="py-24 px-6 bg-white relative" id="feedback">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e0e0e0] to-transparent" />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-1.5 text-[#0d9488] text-sm font-semibold tracking-widest uppercase mb-4">
            <MessageCircle size={14} strokeWidth={2.5} />
            Feedback
          </span>
          <h2 className="text-[2.25rem] tracking-[-0.03em] text-[#1a1a2e] mb-4 leading-[1.15] mt-2">
            Help us make Parallel better
          </h2>
          <p className="text-[#6b7280] text-[1.02rem] leading-relaxed max-w-lg mx-auto">
            Parallel is a new product built to solve a very specific problem:
            making meeting times fair across global teams.
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="bg-[var(--accent)] rounded-2xl p-8 shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {/* Body text */}
                <p className="text-[#262626] text-[0.9rem] leading-relaxed mb-6">
                  Because this is still an early version, your feedback matters a
                  lot. Tell us what works, what feels confusing, what you wish
                  existed, or even what you don&apos;t like.{" "}
                  <span className="text-[#9ca3af]">
                    Good feedback, bad feedback, weird feedback — all welcome.
                  </span>
                </p>

                {/* Quick tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {quickTags.map((tag) => (
                    <motion.button
                      key={tag.label}
                      type="button"
                      onClick={() =>
                        setActiveTag(activeTag === tag.type ? null : tag.type)
                      }
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[0.82rem] border cursor-pointer transition-colors ${
                        activeTag === tag.type
                          ? "bg-[#ecfdf5] border-[#0d9488] text-[#0d9488]"
                          : "bg-white border-[#e5e7eb] text-[#4b5563] hover:border-[#d1d5db]"
                      }`}
                      style={{ fontWeight: activeTag === tag.type ? 500 : 400 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <span>{tag.emoji}</span>
                      {tag.label}
                    </motion.button>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#e5e7eb] text-[#1a1a2e] text-[0.9rem] resize-none focus:outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 transition-all placeholder:text-[#c4c8ce]"
                />

                {submitError && (
                  <p className="text-[0.85rem] text-red-600 mt-2">{submitError}</p>
                )}

                {/* Email + submit row */}
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email (optional)"
                    className="flex-1 px-4 py-3 rounded-xl bg-white border border-[#e5e7eb] text-[#1a1a2e] text-[0.9rem] focus:outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 transition-all placeholder:text-[#c4c8ce]"
                  />
                  <motion.button
                    type="submit"
                    disabled={!message.trim() || submitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-[0.9rem] border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      fontWeight: 500,
                      backgroundColor: "#0d9488",
                    }}
                    whileHover={
                      message.trim() && !submitting
                        ? {
                            backgroundColor: "#0f766e",
                            boxShadow: "0 4px 16px rgba(13,148,136,0.2)",
                          }
                        : {}
                    }
                    whileTap={message.trim() && !submitting ? { scale: 0.97 } : {}}
                    transition={{ duration: 0.2 }}
                  >
                    <Send size={15} />
                    {submitting ? "Sending…" : "Send Feedback"}
                  </motion.button>
                </div>

                {/* Microcopy */}
                <p className="text-[#b0b5be] text-[0.78rem] text-center mt-5">
                  We read every message. Thanks for helping us build a better
                  scheduling tool for global teams.
                </p>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                className="text-center py-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  className="w-14 h-14 rounded-full bg-[#ecfdf5] flex items-center justify-center mx-auto mb-5"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.15,
                  }}
                >
                  <span className="text-2xl">💚</span>
                </motion.div>
                <h3
                  className="text-[#1a1a2e] text-[1.25rem] mb-2"
                  style={{ fontWeight: 600 }}
                >
                  Thank you!
                </h3>
                <p className="text-[#6b7280] text-[0.92rem] max-w-sm mx-auto leading-relaxed">
                  Your feedback helps us make Parallel fairer for every timezone.
                  We&apos;ll read it carefully.
                </p>
                <motion.button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage("");
                    setEmail("");
                    setActiveTag(null);
                    setSubmitError(null);
                  }}
                  className="mt-6 text-[#0d9488] text-[0.85rem] bg-transparent border-0 cursor-pointer hover:underline"
                  style={{ fontWeight: 500 }}
                >
                  Send another
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

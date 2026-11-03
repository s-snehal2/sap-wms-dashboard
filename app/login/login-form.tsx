"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { loginSchema, type LoginSchema } from "./schema";
import { loginAction, type LoginState } from "./action";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CmcLogo } from "@/components/global/cmc-logo";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/* ── Animation variants ─────────────────────────────────────── */
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.45,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

const lineGrow = {
  hidden: { scaleX: 0 },
  show: {
    scaleX: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

export default function LoginForm() {  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    { error: null },
  );

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const isBusy = isPending;

  return (
    <motion.div
      ref={ref}
      variants={container}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className="relative z-10 w-full max-w-sm mx-4"
    >
      {/* Card — copper gold with glossy sheen */}
      <div
        className="relative overflow-hidden rounded-sm shadow-2xl"
        style={{
          background:
            "linear-gradient(160deg, var(--chart-1) 0%, var(--chart-3) 55%, var(--chart-5) 100%)",
        }}
      >
        {/* glossy sheen */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.12) 32%, transparent 55%)",
          }}
        />
        {/* top gloss hairline */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/50" />

        <div className="px-8 pt-10 pb-8 space-y-7">
          {/* Header */}
          <motion.div variants={item} className="space-y-1">
            <div className="flex justify-center mb-6">
              <CmcLogo heightClass="h-9" />
            </div>
            <h1 className="text-center text-2xl font-bold font-heading tracking-tight text-white">
              Sign in
            </h1>
            <p className="text-center text-sm text-white/70">
              Authorized personnel only
            </p>
          </motion.div>

          {/* Divider */}
          <motion.div variants={item} className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/15" />
            <span className="text-[10px] tracking-widest uppercase text-white/60">
              Credentials
            </span>
            <div className="h-px flex-1 bg-white/15" />
          </motion.div>

          {/* Form */}
          <Form {...form}>
            <form action={formAction} className="space-y-4">
              <motion.div variants={item}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold tracking-wider uppercase text-white/80">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="you@company.com"
                          autoComplete="email"
                          className="rounded-sm border-white/25 bg-background/95 focus-visible:ring-primary/60 focus-visible:border-primary h-10"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={item}>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold tracking-wider uppercase text-white/80">
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="rounded-sm border-white/25 bg-background/95 focus-visible:ring-primary/60 focus-visible:border-primary h-10"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Error */}
              {state.error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Alert variant="destructive" className="rounded-sm py-2.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <AlertDescription className="text-xs">
                      {state.error}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <motion.div variants={item} className="pt-1">
                <Button
                  type="submit"
                  className="w-full h-10 rounded-sm font-semibold tracking-wide group relative overflow-hidden bg-white! text-primary! hover:bg-white/90!"
                  disabled={isBusy}
                >
                  {isBusy ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Authenticating…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  )}
                </Button>
              </motion.div>
            </form>
          </Form>
        </div>

        {/* Bottom tag */}
        <motion.div
          variants={item}
          className="px-8 py-3 border-t border-white/15 bg-black/10 flex items-center justify-between"
        >
          <span className="text-[10px] text-white/70 tracking-widest uppercase">
            Secure Access
          </span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] text-white/70">Online</span>
          </div>
        </motion.div>
      </div>

      {/* Version tag */}
      <motion.p
        variants={item}
        className="mt-4 text-center text-[10px] text-muted-foreground/50 tracking-widest uppercase"
      >
        CMC GALLERY APPS V1.0.1
      </motion.p>
    </motion.div>
  );
}

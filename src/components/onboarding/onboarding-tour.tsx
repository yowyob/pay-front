"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  Receipt,
  Sparkles,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const ONBOARDING_STORAGE_KEY = "yypay-onboarding-completed";

const STEP_ICONS: LucideIcon[] = [Sparkles, Wallet, Receipt, Tag, PanelLeft];

type OnboardingContextValue = {
  restart: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return ctx;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const steps = t.onboarding.steps;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const alreadySeen = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (alreadySeen) return;

    const timer = globalThis.setTimeout(() => setOpen(true), 400);
    return () => globalThis.clearTimeout(timer);
  }, []);

  const complete = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    setOpen(false);
    globalThis.setTimeout(() => setStep(0), 200);
  }, []);

  const restart = useCallback(() => {
    setStep(0);
    setOpen(true);
  }, []);

  const isLastStep = step === steps.length - 1;
  const current = steps[step];
  const Icon = STEP_ICONS[step];

  return (
    <OnboardingContext.Provider value={{ restart }}>
      {children}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            complete();
          } else {
            setOpen(true);
          }
        }}
      >
        <DialogContent className="yypay:max-w-lg yypay:overflow-hidden yypay:p-0">
          <div className="yypay:relative yypay:overflow-hidden yypay:bg-gradient-to-br yypay:from-primary/10 yypay:via-card yypay:to-card yypay:px-8 yypay:pb-8 yypay:pt-10">
            <div
              aria-hidden
              className="yypay:pointer-events-none yypay:absolute yypay:-right-10 yypay:-top-16 yypay:h-48 yypay:w-48 yypay:rounded-full yypay:bg-primary/20 yypay:blur-3xl"
            />
            <div
              aria-hidden
              className="yypay:pointer-events-none yypay:absolute yypay:-left-12 yypay:bottom-0 yypay:h-32 yypay:w-32 yypay:rounded-full yypay:bg-primary/10 yypay:blur-2xl"
            />

            <div
              key={step}
              className="yypay:relative yypay:flex yypay:flex-col yypay:items-center yypay:gap-4 yypay:text-center yypay:animate-onboarding-in"
            >
              <span className="yypay:flex yypay:h-16 yypay:w-16 yypay:items-center yypay:justify-center yypay:rounded-2xl yypay:bg-primary yypay:text-primary-foreground yypay:shadow-card">
                <Icon className="yypay:h-7 yypay:w-7" />
              </span>
              <div className="yypay:space-y-2">
                <h2 className="yypay:text-xl yypay:font-bold yypay:text-foreground">
                  {current.title}
                </h2>
                <p className="yypay:text-sm yypay:leading-relaxed yypay:text-muted-foreground">
                  {current.description}
                </p>
              </div>
            </div>

            <div className="yypay:relative yypay:mt-6 yypay:flex yypay:items-center yypay:justify-center yypay:gap-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={t.onboarding.goToStep(index + 1)}
                  onClick={() => setStep(index)}
                  className={cn(
                    "yypay:h-1.5 yypay:rounded-full yypay:transition-all",
                    index === step
                      ? "yypay:w-6 yypay:bg-primary"
                      : "yypay:w-1.5 yypay:bg-primary/25 hover:yypay:bg-primary/40",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="yypay:flex yypay:items-center yypay:justify-between yypay:gap-3 yypay:border-t yypay:border-border yypay:px-6 yypay:py-4">
            <Button variant="ghost" size="sm" onClick={complete}>
              {t.onboarding.skip}
            </Button>

            <div className="yypay:flex yypay:items-center yypay:gap-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((value) => Math.max(0, value - 1))}
                >
                  <ChevronLeft className="yypay:h-4 yypay:w-4" />
                  {t.onboarding.previous}
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  if (isLastStep) {
                    complete();
                  } else {
                    setStep((value) => Math.min(steps.length - 1, value + 1));
                  }
                }}
              >
                {isLastStep ? t.onboarding.start : t.onboarding.next}
                {!isLastStep && <ChevronRight className="yypay:h-4 yypay:w-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </OnboardingContext.Provider>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Phone,
  Mail,
  User,
  Video,
  ArrowRight,
} from "lucide-react";
import clsx from "clsx";

// ============ HELPERS ============

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRange(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type SlotGroup = "morning" | "afternoon" | "evening";

function getSlotGroup(hour: number): SlotGroup {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const GROUP_LABELS: Record<SlotGroup, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const GROUP_ICONS: Record<SlotGroup, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌆",
};

// ============ CANVAS CONFETTI ============

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
      shape: number;
    }[] = [];

    const colors = [
      "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
      "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
      "#F97316", "#6366F1",
    ];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 4,
        size: Math.random() * 8 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        shape: i % 3,
      });
    }

    let animationId: number;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.vy += 0.25;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.004;

        if (p.opacity <= 0) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;

        // Draw varied shapes: 0=circle, 1=square, 2=ribbon
        if (p.shape === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 1) {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }

        ctx.restore();
      }

      if (particles.some((p) => p.opacity > 0)) {
        animationId = requestAnimationFrame(animate);
      }
    }

    animate();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
}

// ============ PULSING DOT ============

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

// ============ PROGRESS BAR ============

function ProgressBar({ step }: { step: number }) {
  const steps = [
    { num: 1, label: "Date" },
    { num: 2, label: "Time" },
    { num: 3, label: "Details" },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((s, i) => {
          const isActive = step === s.num;
          const isPast = step > s.num;

          return (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-500",
                    isActive &&
                      "bg-primary-600 text-white shadow-lg shadow-primary-200 ring-4 ring-primary-100",
                    isPast &&
                      "bg-emerald-500 text-white shadow-sm",
                    !isActive &&
                      !isPast &&
                      "bg-surface-100 text-surface-400"
                  )}
                >
                  {isPast ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    s.num
                  )}
                </div>
                <span
                  className={clsx(
                    "mt-1.5 text-xs font-medium transition-colors duration-300",
                    isActive
                      ? "text-primary-600"
                      : isPast
                      ? "text-emerald-600"
                      : "text-surface-400"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="relative mx-3 mt-[-1.25rem]">
                  <div
                    className={clsx(
                      "h-0.5 w-12 sm:w-16 transition-all duration-500",
                      step > s.num ? "bg-emerald-400" : "bg-surface-200"
                    )}
                  />
                  {step === s.num && (
                    <div
                      className="absolute left-0 top-0 h-0.5 bg-primary-500 transition-all duration-1000"
                      style={{ width: "50%" }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ FADE-IN WRAPPER ============

function AnimatedStep({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) {
  return (
    <div
      key={id}
      className="animate-slide-up"
    >
      {children}
    </div>
  );
}

// ============ MAIN COMPONENT ============

export default function BookPageClient() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState<{
    googleEventId?: string;
  } | null>(null);
  const timezone = getTimezone();

  // Refs for auto-scroll
  const widgetRef = useRef<HTMLDivElement>(null);

  const scrollToTop = useCallback(() => {
    widgetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const isDateInPast = (day: number): boolean => {
    const date = new Date(currentYear, currentMonth, day);
    date.setHours(23, 59, 59, 999);
    return date < today;
  };

  const isDateDisabled = (day: number): boolean => {
    if (isDateInPast(day)) return true;
    const date = new Date(currentYear, currentMonth, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const handleDateSelect = (day: number) => {
    if (isDateDisabled(day)) return;
    const date = new Date(currentYear, currentMonth, day);
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep(2);
    scrollToTop();
  };

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    setSlotsError("");

    const dateStr = selectedDate.toISOString().split("T")[0];
    fetch(`/api/book/slots?date=${dateStr}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setSlotsError(data.error);
          setSlots([]);
        } else {
          setSlots(data.slots ?? []);
        }
      })
      .catch(() => setSlotsError("Failed to load available times"))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate]);

  const handleSlotSelect = (slot: { start: string; end: string }) => {
    setSelectedSlot(slot);
    setStep(3);
    scrollToTop();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    )
      errors.email = "Valid email is required";
    if (!formData.phone.trim()) errors.phone = "Phone is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedSlot) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormErrors({
          submit: data.error || "Failed to book. Please try again.",
        });
        return;
      }

      setAppointmentDetails(data);
      setSubmitted(true);
    } catch {
      setFormErrors({
        submit: "Network error. Please check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calendar rendering
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  // Group slots by time of day
  const groupedSlots = slots.reduce(
    (groups, slot) => {
      const hour = new Date(slot.start).getHours();
      const group = getSlotGroup(hour);
      if (!groups[group]) groups[group] = [];
      groups[group].push(slot);
      return groups;
    },
    {} as Record<SlotGroup, { start: string; end: string }[]>
  );

  // ============ SUCCESS VIEW ============
  if (submitted) {
    return (
      <>
        <ConfettiCanvas />
        <div className="flex flex-col items-center py-4 text-center">
          {/* Animated checkmark */}
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-200/50">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>

          <h2 className="text-3xl font-bold text-surface-900">
            You&apos;re on the calendar! 🎉
          </h2>
          <p className="mt-2 text-surface-500 max-w-xs">
            We&apos;ve sent a confirmation — check your inbox for the Google
            Meet link.
          </p>

          {/* Confirmation card */}
          <div className="mt-8 w-full rounded-2xl border border-surface-200 bg-white p-6 text-left shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-surface-100 pb-3">
              <CalendarDays className="h-4 w-4 text-primary-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                Appointment Details
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                  <CalendarDays className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-surface-800">
                    {selectedDate && formatDate(selectedDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                  <Clock className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-surface-800">
                    {selectedSlot &&
                      `${formatTimeRange(selectedSlot.start)} – ${formatTimeRange(selectedSlot.end)}`}
                  </p>
                  <p className="text-xs text-surface-400">{timezone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                  <Video className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-surface-800">
                    Google Meet
                  </p>
                  <p className="text-xs text-surface-400">
                    Link will be in your confirmation email
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                  <User className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-surface-800">
                    {formData.name}
                  </p>
                  <p className="text-xs text-surface-400">{formData.email}</p>
                </div>
              </div>
            </div>
          </div>

          {appointmentDetails?.googleEventId && (
            <div className="mt-4 flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <PulsingDot />
              Synced to Google Calendar
            </div>
          )}

          <p className="mt-8 text-xs text-surface-400">
            We look forward to speaking with you!
          </p>
        </div>
      </>
    );
  }

  // ============ MAIN BOOKING FLOW ============
  return (
    <div ref={widgetRef} className="space-y-4">
      {/* Step indicator */}
      <div className="mb-1">
        <ProgressBar step={step} />
      </div>

      {/* Step 1: Date Selection */}
      {step === 1 && (
        <AnimatedStep id="step-date">
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-semibold text-surface-900">
                Select a date
              </h3>
              <p className="mt-1 text-sm text-surface-500">
                Choose a day that works for you
              </p>
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between rounded-xl bg-surface-50 px-4 py-2.5">
              <button
                onClick={goToPrevMonth}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-400 transition-all hover:bg-white hover:text-surface-600 hover:shadow-sm"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h4 className="text-base font-semibold text-surface-800">
                {MONTHS[currentMonth]} {currentYear}
              </h4>
              <button
                onClick={goToNextMonth}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-400 transition-all hover:bg-white hover:text-surface-600 hover:shadow-sm"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-surface-400"
                >
                  {d}
                </div>
              ))}
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} />;
                }
                const disabled = isDateDisabled(day);
                const isSelected =
                  selectedDate?.getDate() === day &&
                  selectedDate?.getMonth() === currentMonth &&
                  selectedDate?.getFullYear() === currentYear;

                return (
                  <button
                    key={day}
                    onClick={() => handleDateSelect(day)}
                    disabled={disabled}
                    className={clsx(
                      "relative flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition-all duration-150",
                      isSelected
                        ? "bg-primary-600 text-white shadow-md shadow-primary-200 ring-2 ring-primary-200"
                        : disabled
                        ? "text-surface-300 cursor-not-allowed"
                        : "text-surface-700 hover:bg-primary-50 hover:text-primary-700 active:scale-95"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <p className="flex items-center justify-center gap-1.5 text-xs text-surface-400">
              <Clock className="h-3 w-3" />
              Showing available weekdays in your timezone ({timezone})
            </p>
          </div>
        </AnimatedStep>
      )}

      {/* Step 2: Time Selection */}
      {step === 2 && (
        <AnimatedStep id="step-time">
          <div className="space-y-5">
            {/* Back + header */}
            <div>
              <button
                onClick={() => {
                  setStep(1);
                  scrollToTop();
                }}
                className="group mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-surface-400 transition-colors hover:text-primary-600"
              >
                <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                Change date
              </button>
              <h3 className="text-xl font-semibold text-surface-900">
                Select a time
              </h3>
              <p className="mt-1 text-sm text-surface-500">
                {selectedDate && (
                  <>
                    <span className="font-medium text-surface-700">
                      {formatDate(selectedDate)}
                    </span>
                    <span className="ml-1.5 text-surface-400">
                      ({timezone})
                    </span>
                  </>
                )}
              </p>
            </div>

            {slotsLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary-500" />
                <p className="text-sm text-surface-400">
                  Loading available times...
                </p>
              </div>
            ) : slotsError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-sm text-red-600">{slotsError}</p>
                <button
                  onClick={() => {
                    setStep(1);
                    setSelectedDate(null);
                  }}
                  className="mt-3 text-xs font-medium text-red-700 underline underline-offset-2 hover:text-red-800"
                >
                  Try another date
                </button>
              </div>
            ) : slots.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
                <Clock className="mx-auto mb-3 h-10 w-10 text-amber-400" />
                <p className="text-sm font-medium text-amber-800">
                  No available slots for this date
                </p>
                <p className="mt-1 text-xs text-amber-600">
                  Try selecting a different date.
                </p>
                <button
                  onClick={() => {
                    setStep(1);
                    setSelectedDate(null);
                  }}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-800"
                >
                  Go back to calendar
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {(
                  ["morning", "afternoon", "evening"] as SlotGroup[]
                ).map((group) => {
                  const groupSlots = groupedSlots[group];
                  if (!groupSlots?.length) return null;
                  return (
                    <div key={group}>
                      <div className="mb-2.5 flex items-center gap-2">
                        <span className="text-sm">
                          {GROUP_ICONS[group]}
                        </span>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                          {GROUP_LABELS[group]}
                        </h4>
                        <div className="flex-1 border-t border-surface-100" />
                        <span className="text-xs text-surface-300">
                          {groupSlots.length} slots
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {groupSlots.map((slot) => {
                          const isSelected =
                            selectedSlot?.start === slot.start;
                          return (
                            <button
                              key={slot.start}
                              onClick={() => handleSlotSelect(slot)}
                              className={clsx(
                                "group relative rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all duration-150",
                                isSelected
                                  ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm"
                                  : "border-surface-200 bg-white text-surface-600 hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-700 hover:shadow-sm active:scale-[0.97]"
                              )}
                            >
                              <span className="block text-sm font-semibold">
                                {formatTime(slot.start)}
                              </span>
                              <span
                                className={clsx(
                                  "mt-0.5 block text-xs transition-colors duration-150",
                                  isSelected
                                    ? "text-primary-400"
                                    : "text-surface-400 group-hover:text-primary-400"
                                )}
                              >
                                {Math.round(
                                  (new Date(slot.end).getTime() -
                                    new Date(slot.start).getTime()) /
                                    60000
                                )}{" "}
                                min
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </AnimatedStep>
      )}

      {/* Step 3: Contact Info */}
      {step === 3 && (
        <AnimatedStep id="step-info">
          <div className="space-y-6">
            {/* Back + header */}
            <div>
              <button
                onClick={() => {
                  setStep(2);
                  scrollToTop();
                }}
                className="group mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-surface-400 transition-colors hover:text-primary-600"
              >
                <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                Change time
              </button>
              <h3 className="text-xl font-semibold text-surface-900">
                Your details
              </h3>
              <p className="mt-1 text-sm text-surface-500">
                How can we reach you to confirm?
              </p>
            </div>

            {/* Booking Summary Card */}
            <div className="rounded-xl border border-surface-200 bg-gradient-to-br from-primary-50/50 to-white p-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-primary-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-surface-800">
                    {selectedDate && formatDate(selectedDate)}
                  </p>
                  <p className="text-xs text-surface-500">
                    {selectedSlot &&
                      `${formatTime(selectedSlot.start)} – ${formatTime(selectedSlot.end)}`}
                    <span className="ml-1">· {timezone}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label
                  htmlFor="booking-name"
                  className="mb-1.5 block text-sm font-medium text-surface-700"
                >
                  Full name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                  <input
                    id="booking-name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }));
                      setFormErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    placeholder="John Doe"
                    autoComplete="name"
                    className={clsx(
                      "w-full rounded-xl border-2 bg-white py-3 pl-10 pr-4 text-sm text-surface-900 placeholder-surface-400 transition-all duration-150 focus:outline-none",
                      formErrors.name
                        ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                        : "border-surface-200 focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                    )}
                  />
                </div>
                {formErrors.name && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="booking-email"
                  className="mb-1.5 block text-sm font-medium text-surface-700"
                >
                  Email address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                  <input
                    id="booking-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }));
                      setFormErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    placeholder="john@example.com"
                    autoComplete="email"
                    className={clsx(
                      "w-full rounded-xl border-2 bg-white py-3 pl-10 pr-4 text-sm text-surface-900 placeholder-surface-400 transition-all duration-150 focus:outline-none",
                      formErrors.email
                        ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                        : "border-surface-200 focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                    )}
                  />
                </div>
                {formErrors.email && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="booking-phone"
                  className="mb-1.5 block text-sm font-medium text-surface-700"
                >
                  Phone number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                  <input
                    id="booking-phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }));
                      setFormErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                    placeholder="+1 (555) 123-4567"
                    autoComplete="tel"
                    className={clsx(
                      "w-full rounded-xl border-2 bg-white py-3 pl-10 pr-4 text-sm text-surface-900 placeholder-surface-400 transition-all duration-150 focus:outline-none",
                      formErrors.phone
                        ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                        : "border-surface-200 focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                    )}
                  />
                </div>
                {formErrors.phone && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {formErrors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Submit error */}
            {formErrors.submit && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">{formErrors.submit}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={clsx(
                "group relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-200",
                submitting
                  ? "bg-primary-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 hover:shadow-xl active:scale-[0.98]"
              )}
            >
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              {submitting ? (
                <span className="relative flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Booking...
                </span>
              ) : (
                <span className="relative flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Confirm Booking
                </span>
              )}
            </button>

            <p className="text-center text-xs text-surface-400">
              By booking, you agree to our{" "}
              <span className="underline hover:text-surface-600 cursor-default">
                terms
              </span>{" "}
              and{" "}
              <span className="underline hover:text-surface-600 cursor-default">
                privacy policy
              </span>.
            </p>
          </div>
        </AnimatedStep>
      )}
    </div>
  );
}

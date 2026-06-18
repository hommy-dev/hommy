"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Clock, Briefcase } from "lucide-react";
import type { ContractorPublicProfile } from "@/lib/data/contractor-profile";
import { getContractorProfileAction } from "@/lib/actions/contractor-profile";
import { showToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Stars } from "@/components/reviews/stars";
import { ParticipantAvatar } from "@/components/messaging/participant-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ratingLabel, responseLabel } from "./rating-badge";

/**
 * "View profile" trigger + dialog. Lazy-loads the contractor's public profile
 * (rating, reviews, verification, experience, bio) so the homeowner can size up
 * a company before chatting or accepting a quote.
 */
export function ContractorProfileDialog({
  contractorId,
  contractorName,
  triggerClassName,
  triggerLabel = "View profile",
}: {
  contractorId: string;
  contractorName?: string | null;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ContractorPublicProfile | null>(null);
  const [loading, start] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && !profile) {
      start(async () => {
        const res = await getContractorProfileAction(contractorId);
        if (res) setProfile(res);
        else showToast("Couldn’t load this profile.", { type: "error" });
      });
    }
  }

  const name = profile?.companyName ?? contractorName ?? "Contractor";
  const rated = (profile?.totalReviews ?? 0) > 0 && profile?.avgRating != null;
  const respond = responseLabel(profile?.avgResponseTimeMinutes ?? null);

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className={
          triggerClassName ??
          "inline-flex items-center justify-center rounded-md lg:rounded-[0.417vw] border border-border bg-card px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-xs lg:text-[0.833vw] font-semibold transition-colors hover:bg-muted"
        }
      >
        {triggerLabel}
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg lg:max-w-[34vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 lg:gap-[0.833vw]">
              <ParticipantAvatar name={name} className="size-10 lg:size-[2.778vw] border" />
              <span className="flex items-center gap-2 lg:gap-[0.556vw]">
                {name}
                {profile?.verified ? (
                  <span className="inline-flex items-center gap-1 lg:gap-[0.278vw] rounded-full bg-success/15 px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-medium text-success">
                    <BadgeCheck className="size-3.5 lg:size-[0.972vw]" strokeWidth={2} /> Verified
                  </span>
                ) : null}
              </span>
            </DialogTitle>
          </DialogHeader>

          {loading && !profile ? (
            <p className="py-6 lg:py-[1.667vw] text-center text-sm lg:text-[0.903vw] text-muted-foreground">Loading…</p>
          ) : profile ? (
            <div className="space-y-5 lg:space-y-[1.389vw]">
              {/* Rating headline — visual + descriptive */}
              <div className="rounded-lg lg:rounded-[0.694vw] border border-border bg-muted/30 p-4 lg:p-[1.111vw]">
                <div className="flex items-center gap-2 lg:gap-[0.556vw]">
                  {rated ? <Stars rating={profile.avgRating as number} starClassName="lg:size-[1.111vw]" /> : null}
                  <span className="text-sm lg:text-[1.042vw] font-semibold">
                    {ratingLabel(profile.avgRating, profile.totalReviews)}
                  </span>
                </div>
                <p className="mt-1 lg:mt-[0.278vw] text-xs lg:text-[0.833vw] text-muted-foreground">
                  {rated
                    ? `${(profile.avgRating as number).toFixed(1)} average · ${profile.totalReviews} review${profile.totalReviews === 1 ? "" : "s"} on Homei`
                    : "No reviews yet — this company is new to Homei."}
                </p>
              </div>

              {/* Quick facts */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 lg:gap-x-[1.389vw] lg:gap-y-[0.556vw] text-sm lg:text-[0.903vw]">
                {profile.yearsInBusiness ? (
                  <span className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] text-muted-foreground">
                    <Briefcase className="size-4 lg:size-[1.111vw]" strokeWidth={2} />
                    {profile.yearsInBusiness} year{profile.yearsInBusiness === 1 ? "" : "s"} in business
                  </span>
                ) : null}
                {respond ? (
                  <span className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] text-muted-foreground">
                    <Clock className="size-4 lg:size-[1.111vw]" strokeWidth={2} />
                    {respond}
                  </span>
                ) : null}
              </div>

              {profile.bio ? (
                <p className="whitespace-pre-wrap text-sm lg:text-[0.903vw] leading-relaxed text-foreground/80">
                  {profile.bio}
                </p>
              ) : null}

              {profile.reviews.length > 0 ? (
                <div className="space-y-3 lg:space-y-[0.833vw]">
                  <h3 className="text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                    Recent reviews
                  </h3>
                  <ul className="space-y-2.5 lg:space-y-[0.694vw] max-h-[40vh] overflow-y-auto">
                    {profile.reviews.map((r) => (
                      <li key={r.id} className="rounded-md lg:rounded-[0.556vw] border border-border p-3 lg:p-[0.833vw]">
                        <div className="flex items-center justify-between gap-2 lg:gap-[0.556vw]">
                          <Stars rating={r.rating} className="gap-0" />
                          <span className="text-xs lg:text-[0.764vw] text-muted-foreground">
                            {formatDate(r.submittedAt)}
                          </span>
                        </div>
                        {r.comment ? (
                          <p className="mt-1.5 lg:mt-[0.417vw] text-sm lg:text-[0.903vw] text-foreground/80">
                            “{r.comment}”
                          </p>
                        ) : null}
                        <p className="mt-1 lg:mt-[0.278vw] text-xs lg:text-[0.764vw] text-muted-foreground">
                          — {r.reviewerName ?? "Verified homeowner"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className={cn("py-6 lg:py-[1.667vw] text-center text-sm lg:text-[0.903vw] text-muted-foreground")}>
              Profile unavailable.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

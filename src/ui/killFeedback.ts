/**
 * Kill Impact, Multi-Kill Streaks, and Tactile Feedback HUD System
 * Delivers arcade-like visceral responsiveness inspired by Deadshot.io
 */

import { playMultiKillSting } from '../audio/soundEffects';

interface KillEventData {
  victimName: string;
  victimTeam: string;
  weaponName: string;
  distanceMeters: number;
  isHeadshot: boolean;
}

class KillFeedbackManager {
  private streakCount = 0;
  private lastKillTime = 0;
  private streakTimeout: any = null;
  private bannerTimeout: any = null;
  private hitVignetteTimeout: any = null;

  private bannerContainer: HTMLElement | null = null;
  private hitVignetteEl: HTMLElement | null = null;
  private hitmarkerEl: HTMLElement | null = null;
  private hitmarkerBadgeEl: HTMLElement | null = null;

  init() {
    this.createElements();
  }

  private createElements() {
    // 1. Center Kill Announcement Banner Container
    let banner = document.getElementById('killBannerContainer');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'killBannerContainer';
      banner.className = 'kill-banner-container';
      document.body.appendChild(banner);
    }
    this.bannerContainer = banner;

    // 2. Hit Vignette Flash (subtle green/cyan hit confirmation border flare)
    let hitVig = document.getElementById('hitVignette');
    if (!hitVig) {
      hitVig = document.createElement('div');
      hitVig.id = 'hitVignette';
      hitVig.className = 'hit-vignette';
      document.body.appendChild(hitVig);
    }
    this.hitVignetteEl = hitVig;

    this.hitmarkerEl = document.getElementById('hitmarker');
    this.hitmarkerBadgeEl = document.getElementById('killConfirmBadge');
  }

  /**
   * Flash momentary peripheral hit vignette confirming shot connection
   */
  triggerHitVignette(isHeadshot: boolean = false) {
    if (!this.hitVignetteEl) this.createElements();
    if (!this.hitVignetteEl) return;

    this.hitVignetteEl.classList.remove('active', 'headshot');
    void this.hitVignetteEl.offsetWidth; // Reflow
    if (isHeadshot) {
      this.hitVignetteEl.classList.add('headshot');
    }
    this.hitVignetteEl.classList.add('active');

    clearTimeout(this.hitVignetteTimeout);
    this.hitVignetteTimeout = setTimeout(() => {
      this.hitVignetteEl?.classList.remove('active', 'headshot');
    }, 110);
  }

  /**
   * Record an operative elimination by the player
   */
  recordKill(data: KillEventData) {
    const now = performance.now();
    if (now - this.lastKillTime < 4500) {
      this.streakCount++;
    } else {
      this.streakCount = 1;
    }
    this.lastKillTime = now;

    // Play announcer sting for multi-kills
    if (this.streakCount >= 2) {
      playMultiKillSting(this.streakCount);
    }

    this.displayKillBanner(data, this.streakCount);
  }

  private displayKillBanner(data: KillEventData, streak: number) {
    if (!this.bannerContainer) this.createElements();
    if (!this.bannerContainer) return;

    let streakTitle = 'OPERATIVE ELIMINATED';
    let streakColorClass = 'streak-1';
    let streakMedalIcon = '💀';

    if (streak === 2) {
      streakTitle = 'DOUBLE KILL';
      streakColorClass = 'streak-2';
      streakMedalIcon = '⚡⚡';
    } else if (streak === 3) {
      streakTitle = 'TRIPLE KILL';
      streakColorClass = 'streak-3';
      streakMedalIcon = '🔥⚔️';
    } else if (streak === 4) {
      streakTitle = 'RAMPAGE';
      streakColorClass = 'streak-4';
      streakMedalIcon = '👑💀';
    } else if (streak >= 5) {
      streakTitle = `ACE // UNSTOPPABLE x${streak}`;
      streakColorClass = 'streak-ace';
      streakMedalIcon = '☠️⚡☠️';
    }

    const distText = `${Math.round(data.distanceMeters)}m`;
    const headshotBonusHtml = data.isHeadshot
      ? `<div class="banner-headshot-pill">🎯 CRITICAL HEADSHOT (+100)</div>`
      : '';

    this.bannerContainer.innerHTML = `
      <div class="kill-banner-card ${streakColorClass}">
        <div class="banner-medal-badge">${streakMedalIcon}</div>
        <div class="banner-text-block">
          <div class="banner-streak-title">${streakTitle}</div>
          <div class="banner-sub-row">
            <span class="banner-victim">${data.victimName}</span>
            <span class="banner-dot">&bull;</span>
            <span class="banner-weapon">${data.weaponName}</span>
            <span class="banner-dot">&bull;</span>
            <span class="banner-dist">${distText}</span>
          </div>
          ${headshotBonusHtml}
        </div>
      </div>
    `;

    this.bannerContainer.classList.remove('show');
    void this.bannerContainer.offsetWidth; // Reflow for animation
    this.bannerContainer.classList.add('show');

    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      this.bannerContainer?.classList.remove('show');
    }, 2800);
  }

  resetStreak() {
    this.streakCount = 0;
    this.lastKillTime = 0;
  }
}

export const killFeedback = new KillFeedbackManager();

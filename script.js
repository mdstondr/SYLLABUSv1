(function () {
  'use strict';

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const body = document.body;
  const header = document.getElementById('site-header');
  const heroSection = document.querySelector('.hero');
  const keyboardHint = document.getElementById('keyboard-hint');
  let scrollSyncFrame = 0;
  let scrollPauseTimer = null;
  let scrollMotionPaused = false;

  function setScrollMotionPaused(paused) {
    if (scrollMotionPaused === paused) return;
    scrollMotionPaused = paused;
    body?.classList.toggle('is-scrolling', paused);
  }

  function markScrollActivity() {
    setScrollMotionPaused(true);
    window.clearTimeout(scrollPauseTimer);
    scrollPauseTimer = window.setTimeout(() => {
      setScrollMotionPaused(false);
    }, reducedMotionQuery.matches ? 80 : 160);
  }

  function scheduleHeaderSync() {
    if (scrollSyncFrame) return;

    scrollSyncFrame = window.requestAnimationFrame(() => {
      scrollSyncFrame = 0;
      syncHeaderScrollState();
    });
  }

  function syncHeaderScrollState() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 20);

    if (!heroSection) return;

    const heroBottom = heroSection.getBoundingClientRect().bottom;
    const headerThreshold = (header.offsetHeight || 0) + 12;
    header.classList.toggle('hero-passed', heroBottom <= headerThreshold);
  }

  window.addEventListener('scroll', () => {
    markScrollActivity();
    scheduleHeaderSync();
  }, { passive: true });
  window.addEventListener('resize', scheduleHeaderSync);
  syncHeaderScrollState();

  if (keyboardHint) {
    document.addEventListener('keydown', (event) => {
      if (!event.key.startsWith('Arrow')) return;
      keyboardHint.classList.add('is-dismissed');
    });
  }

  const revealElements = Array.from(document.querySelectorAll('[data-reveal]'));

  function isElementInViewport(element, threshold = 0.16) {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const inset = rect.height * threshold;

    return rect.bottom - inset > 0 && rect.top + inset < viewportHeight;
  }

  function syncRevealInView() {
    revealElements.forEach((element) => {
      if (element.classList.contains('is-visible')) return;
      if (isElementInViewport(element, 0.14)) {
        element.classList.add('is-visible');
      }
    });
  }

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach((element) => revealObserver.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  }

  window.addEventListener('load', syncRevealInView, { once: true });
  window.addEventListener('resize', syncRevealInView, { passive: true });
  window.requestAnimationFrame(syncRevealInView);

  const heroStageShell = document.getElementById('hero-stage-shell');
  const heroStageStack = document.getElementById('hero-stage-stack');

  let heroHoverActive = false;
  let heroFloatAngle = 0;
  let heroMotionVisible = !heroSection;
  let heroAtRest = false;
  let heroPointerFrame = 0;
  let heroPointerEvent = null;

  function getHeroBaseTransform() {
    if (window.innerWidth <= 640) {
      return 'perspective(1400px) rotateX(5deg) rotateY(-6deg) rotateZ(-1.1deg)';
    }

    if (window.innerWidth <= 900) {
      return 'perspective(2000px) rotateX(7deg) rotateY(-10deg) rotateZ(-1.6deg)';
    }

    return 'perspective(2600px) rotateX(9deg) rotateY(-14deg) rotateZ(-1.8deg)';
  }

  function setHeroStageTransform(options = {}) {
    if (!heroStageStack) return;

    const {
      shiftX = 0,
      shiftY = 0,
      tiltX = 0,
      tiltY = 0,
      rotateZ = 0,
      scale = 1,
    } = options;

    heroStageStack.style.transform =
      `${getHeroBaseTransform()} translate3d(${shiftX}px, ${shiftY}px, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
  }

  if (heroStageShell && heroStageStack) {
    setHeroStageTransform();

    if (heroSection && 'IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          heroMotionVisible = entry.isIntersecting && entry.intersectionRatio > 0.14;
        });
      }, {
        threshold: [0, 0.14, 0.28, 0.42],
      });

      heroObserver.observe(heroSection);
    }

    heroStageShell.addEventListener('mousemove', (event) => {
      if (window.innerWidth < 900 || reducedMotionQuery.matches || scrollMotionPaused) return;

      heroHoverActive = true;
      heroAtRest = false;
      heroPointerEvent = event;

      if (heroPointerFrame) return;

      heroPointerFrame = window.requestAnimationFrame(() => {
        heroPointerFrame = 0;
        if (!heroPointerEvent) return;

        const rect = heroStageShell.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = (heroPointerEvent.clientX - centerX) / (rect.width / 2);
        const dy = (heroPointerEvent.clientY - centerY) / (rect.height / 2);

        setHeroStageTransform({
          shiftX: dx * 14,
          shiftY: dy * 8,
          tiltX: -dy * 2.8,
          tiltY: dx * 4.8,
          rotateZ: dx * 0.7,
          scale: 1.01,
        });
      });
    });

    heroStageShell.addEventListener('mouseleave', () => {
      heroHoverActive = false;
      heroPointerEvent = null;
      setHeroStageTransform();
      heroAtRest = true;
    });

    if (!reducedMotionQuery.matches) {
      const tickHeroFloat = () => {
        if (
          !heroHoverActive &&
          !scrollMotionPaused &&
          heroMotionVisible &&
          window.innerWidth >= 900 &&
          !document.hidden
        ) {
          heroFloatAngle += 0.0085;

          setHeroStageTransform({
            shiftX: Math.cos(heroFloatAngle * 0.72) * 6,
            shiftY: Math.sin(heroFloatAngle) * 4,
            tiltX: Math.sin(heroFloatAngle * 0.82) * 1.1,
            tiltY: Math.cos(heroFloatAngle * 0.58) * 1.4,
            rotateZ: Math.sin(heroFloatAngle * 0.44) * 0.16,
            scale: 1.004,
          });
          heroAtRest = false;
        } else if (!heroHoverActive && !heroAtRest) {
          setHeroStageTransform();
          heroAtRest = true;
        }

        window.requestAnimationFrame(tickHeroFloat);
      };

      window.requestAnimationFrame(tickHeroFloat);
    }

    window.addEventListener('resize', () => {
      if (heroHoverActive || reducedMotionQuery.matches) return;
      setHeroStageTransform();
    }, { passive: true });
  }

  const showcasePanels = Array.from(document.querySelectorAll('.section-showcase .hero-screen[data-showcase-shot-panel]'));
  const showcaseMockup = document.getElementById('showcase-mockup');
  const showcaseHoverZone = document.querySelector('.showcase-stage-shell');
  const showcaseStageVisual = document.querySelector('.showcase-stage-visual');
  const showcasePrevButton = document.querySelector('.showcase-arrow-prev');
  const showcaseNextButton = document.querySelector('.showcase-arrow-next');
  const showcaseCopyPanel = document.querySelector('.showcase-copy-panel');
  const showcaseProgressDots = Array.from(document.querySelectorAll('.showcase-progress-dot'));
  const showcaseCurrentCount = document.getElementById('showcase-current-count');
  const showcaseCopyKicker = document.getElementById('showcase-copy-kicker');
  const showcaseCopyTitle = document.getElementById('showcase-copy-title');
  const showcaseCopyBody = document.getElementById('showcase-copy-body');
  const showcasePointA = document.getElementById('showcase-point-a');
  const showcasePointB = document.getElementById('showcase-point-b');
  const showcasePointC = document.getElementById('showcase-point-c');
  const sectionStops = Array.from(document.querySelectorAll([
    'main > .hero',
    '.section-story .section-head',
    '.section-story [data-story-act]',
    'main > .section-showcase',
    '.section-showcase .showcase-layout',
    '.section-download .download-film'
  ].join(', ')));

  let activeShowcaseIndex = 0;
  let showcaseHovered = false;
  let showcaseAutoRotate = null;
  let showcaseFloatAngle = 0;
  let showcasePointerX = window.innerWidth / 2;
  let showcasePointerY = window.innerHeight / 2;
  const showcaseCopyBaseRotateY = 0.6;
  let showcaseMotionVisible = false;
  let showcaseAtRest = false;
  let showcasePointerFrame = 0;
  let sectionNavLocked = false;
  let sectionNavTimer = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isEditableTarget(target) {
    if (!target || !(target instanceof Element)) return false;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]'));
  }

  function isShowcaseInViewport() {
    if (!showcaseHoverZone) return false;

    const rect = showcaseHoverZone.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom > viewportHeight * 0.12 && rect.top < viewportHeight * 0.88;
  }

  function getHeaderOffset() {
    return (header?.offsetHeight || 0) + 14;
  }

  function getSectionStopTop(section) {
    const headerOffset = getHeaderOffset();
    const rect = section.getBoundingClientRect();
    const sectionTop = rect.top + window.scrollY;

    if (section.matches('.download-film')) {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const centeredOffset = Math.max(headerOffset + 20, (viewportHeight - rect.height) / 2);
      return Math.max(0, sectionTop - centeredOffset);
    }

    return Math.max(0, sectionTop - headerOffset);
  }

  function getActiveSectionIndex() {
    if (!sectionStops.length) return -1;

    const currentY = window.scrollY + getHeaderOffset() + 12;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    sectionStops.forEach((section, index) => {
      const stopTop = getSectionStopTop(section);
      const distance = Math.abs(stopTop - currentY);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  function scrollToSectionIndex(index) {
    if (!sectionStops.length) return;

    const clampedIndex = clamp(index, 0, sectionStops.length - 1);
    const targetSection = sectionStops[clampedIndex];
    const top = getSectionStopTop(targetSection);

    sectionNavLocked = true;
    window.clearTimeout(sectionNavTimer);

    window.scrollTo({
      top,
      behavior: reducedMotionQuery.matches ? 'auto' : 'smooth',
    });

    sectionNavTimer = window.setTimeout(() => {
      sectionNavLocked = false;
    }, reducedMotionQuery.matches ? 120 : 720);
  }

  function getShowcaseGlobalDrift() {
    if (!showcaseHoverZone) {
      return { dx: 0, dy: 0 };
    }

    const rect = showcaseHoverZone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return {
      dx: clamp((showcasePointerX - centerX) / (window.innerWidth * 0.58), -1, 1),
      dy: clamp((showcasePointerY - centerY) / (window.innerHeight * 0.62), -1, 1),
    };
  }

  function setShowcaseCopyTransform(shiftX = 0, shiftY = 0, tiltX = 0, tiltY = 0, rotateZ = 0) {
    if (!showcaseCopyPanel) return;

    showcaseCopyPanel.style.transform =
      `translate3d(${shiftX}px, calc(-50% + ${shiftY}px), 180px) rotateX(${tiltX}deg) rotateY(${showcaseCopyBaseRotateY + tiltY}deg) rotateZ(${rotateZ}deg)`;
  }

  function applyShowcaseTransforms(mockupValues, copyValues) {
    if (showcaseMockup) {
      showcaseMockup.style.transform =
        `translate3d(${mockupValues.x}px, ${mockupValues.y}px, 0) rotateX(${mockupValues.tiltX}deg) rotateY(${mockupValues.tiltY}deg) rotateZ(${mockupValues.rotateZ}deg)`;
    }

    setShowcaseCopyTransform(
      copyValues.x,
      copyValues.y,
      copyValues.tiltX,
      copyValues.tiltY,
      copyValues.rotateZ
    );
  }

  function restartShowcaseMotion(element, className) {
    if (!element) return;

    element.classList.remove(className);
    window.clearTimeout(element._motionTimer);
    void element.offsetWidth;
    element.classList.add(className);
    element._motionTimer = window.setTimeout(() => {
      element.classList.remove(className);
    }, 650);
  }

  function syncShowcaseCopy(activePanel, animate) {
    if (showcaseCurrentCount) showcaseCurrentCount.textContent = activePanel.dataset.showcaseIndex || '';
    if (showcaseCopyKicker) showcaseCopyKicker.textContent = activePanel.dataset.showcaseKicker || '';
    if (showcaseCopyTitle) showcaseCopyTitle.textContent = activePanel.dataset.showcaseTitle || '';
    if (showcaseCopyBody) showcaseCopyBody.textContent = activePanel.dataset.showcaseBody || '';
    if (showcasePointA) showcasePointA.textContent = activePanel.dataset.showcasePointA || '';
    if (showcasePointB) showcasePointB.textContent = activePanel.dataset.showcasePointB || '';
    if (showcasePointC) showcasePointC.textContent = activePanel.dataset.showcasePointC || '';

    showcaseProgressDots.forEach((dot, index) => {
      dot.classList.toggle('active', index === activeShowcaseIndex);
    });

    if (animate) {
      restartShowcaseMotion(showcaseCopyPanel, 'is-transitioning');
    }
  }

  function applyShowcaseShot(name, options = {}) {
    const activePanel = showcasePanels.find((panel) => panel.dataset.showcaseShotPanel === name) || showcasePanels[0];
    if (!activePanel) return;

    const animate = options.animate !== false;
    activeShowcaseIndex = showcasePanels.indexOf(activePanel);

    showcasePanels.forEach((panel, index) => {
      const delta = (index - activeShowcaseIndex + showcasePanels.length) % showcasePanels.length;
      panel.classList.remove('is-current', 'is-next', 'is-prev', 'is-back');

      if (delta === 0) {
        panel.classList.add('is-current');
      } else if (delta === 1) {
        panel.classList.add('is-next');
      } else if (delta === showcasePanels.length - 1) {
        panel.classList.add('is-prev');
      } else {
        panel.classList.add('is-back');
      }
    });

    syncShowcaseCopy(activePanel, animate);

    if (showcaseStageVisual) {
      showcaseStageVisual.setAttribute(
        'aria-label',
        `Interaktiver Showcase: ${activePanel.dataset.showcaseTitle || activePanel.dataset.showcaseShotPanel || 'Screen'}`
      );

      if (animate) {
        restartShowcaseMotion(showcaseStageVisual, 'is-transitioning');
      }
    }
  }

  function startShowcaseAutoRotate() {
    window.clearInterval(showcaseAutoRotate);

    if (reducedMotionQuery.matches || showcasePanels.length < 2) return;

    showcaseAutoRotate = window.setInterval(() => {
      if (showcaseHovered || scrollMotionPaused || !showcaseMotionVisible || document.hidden) return;
      const nextIndex = (activeShowcaseIndex + 1) % showcasePanels.length;
      applyShowcaseShot(showcasePanels[nextIndex].dataset.showcaseShotPanel);
    }, 4800);
  }

  function stepShowcase(direction) {
    if (showcasePanels.length < 2) return;
    const nextIndex = (activeShowcaseIndex + direction + showcasePanels.length) % showcasePanels.length;
    applyShowcaseShot(showcasePanels[nextIndex].dataset.showcaseShotPanel);
    startShowcaseAutoRotate();
  }

  if (showcaseMockup && showcaseHoverZone && showcasePanels.length) {
    applyShowcaseShot(showcasePanels[0].dataset.showcaseShotPanel, { animate: false });
    showcaseMotionVisible = isShowcaseInViewport();

    if ('IntersectionObserver' in window) {
      const showcaseObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          showcaseMotionVisible = entry.isIntersecting && entry.intersectionRatio > 0.16;
        });
      }, {
        threshold: [0, 0.16, 0.32, 0.48],
      });

      showcaseObserver.observe(showcaseHoverZone);
    }

    window.addEventListener('mousemove', (event) => {
      showcasePointerX = event.clientX;
      showcasePointerY = event.clientY;
    }, { passive: true });

    if (showcasePrevButton) {
      showcasePrevButton.addEventListener('click', () => {
        stepShowcase(-1);
        showcaseStageVisual?.focus({ preventScroll: true });
      });
    }

    if (showcaseNextButton) {
      showcaseNextButton.addEventListener('click', () => {
        stepShowcase(1);
        showcaseStageVisual?.focus({ preventScroll: true });
      });
    }

    if (showcaseStageVisual) {
      showcaseStageVisual.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          stepShowcase(1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          stepShowcase(-1);
        }
      });

      showcaseStageVisual.addEventListener('focusin', () => {
        showcaseHovered = true;
      });

      showcaseStageVisual.addEventListener('focusout', () => {
        showcaseHovered = false;
      });
    }

    showcaseHoverZone.addEventListener('mousemove', (event) => {
      if (window.innerWidth < 900 || reducedMotionQuery.matches || scrollMotionPaused) return;

      showcasePointerX = event.clientX;
      showcasePointerY = event.clientY;
      showcaseHovered = true;
      showcaseAtRest = false;

      if (showcasePointerFrame) return;

      showcasePointerFrame = window.requestAnimationFrame(() => {
        showcasePointerFrame = 0;

        const rect = showcaseHoverZone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = (showcasePointerX - centerX) / (rect.width / 2);
        const dy = (showcasePointerY - centerY) / (rect.height / 2);

        applyShowcaseTransforms(
          {
            x: dx * 9,
            y: dy * 7,
            tiltX: -dy * 3.8,
            tiltY: -dx * 6.2,
            rotateZ: dx * 0.7,
          },
          {
            x: -dx * 5,
            y: -dy * 4,
            tiltX: dy * 1.7,
            tiltY: dx * 3,
            rotateZ: -dx * 0.36,
          }
        );
      });
    });

    showcaseHoverZone.addEventListener('mouseenter', () => {
      showcaseHovered = true;
      showcaseStageVisual?.focus({ preventScroll: true });
    });

      showcaseHoverZone.addEventListener('mouseleave', () => {
      showcaseHovered = false;

      if (window.innerWidth < 900 || reducedMotionQuery.matches) {
        if (showcaseMockup) showcaseMockup.style.transform = '';
        if (showcaseCopyPanel) showcaseCopyPanel.style.transform = '';
        showcaseAtRest = true;
      }
    });

    if (!reducedMotionQuery.matches) {
      const tickShowcaseFloat = () => {
        if (
          !showcaseHovered &&
          !scrollMotionPaused &&
          showcaseMotionVisible &&
          window.innerWidth >= 900 &&
          !document.hidden
        ) {
          const drift = getShowcaseGlobalDrift();
          showcaseFloatAngle += 0.01;

          applyShowcaseTransforms(
            {
              x: Math.cos(showcaseFloatAngle * 0.7) * 4 + drift.dx * 4.5,
              y: Math.sin(showcaseFloatAngle) * 3.8 + drift.dy * 3.2,
              tiltX: 1.8 + Math.sin(showcaseFloatAngle * 0.8) * 1 - drift.dy * 1.2,
              tiltY: -4 + Math.cos(showcaseFloatAngle * 0.6) * 1 - drift.dx * 1.8,
              rotateZ: -0.45 + Math.sin(showcaseFloatAngle * 0.5) * 0.34 + drift.dx * 0.2,
            },
            {
              x: -Math.cos(showcaseFloatAngle * 0.7) * 3.2 - drift.dx * 3.6,
              y: -Math.sin(showcaseFloatAngle) * 2.8 - drift.dy * 3,
              tiltX: -.8 + Math.sin(showcaseFloatAngle * 0.7) * 0.6 + drift.dy * 0.7,
              tiltY: 1.6 - Math.cos(showcaseFloatAngle * 0.55) * 0.8 + drift.dx * 1.2,
                rotateZ: 0.3 - Math.sin(showcaseFloatAngle * 0.45) * 0.24 - drift.dx * 0.16,
              }
            );
          showcaseAtRest = false;
        } else if (!showcaseHovered && !showcaseAtRest) {
          if (showcaseCopyPanel) showcaseCopyPanel.style.transform = '';
          if (showcaseMockup) showcaseMockup.style.transform = '';
          showcaseAtRest = true;
        }

        window.requestAnimationFrame(tickShowcaseFloat);
      };

      window.requestAnimationFrame(tickShowcaseFloat);
    }

    document.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || !isShowcaseInViewport() || isEditableTarget(event.target)) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepShowcase(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepShowcase(-1);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.clearInterval(showcaseAutoRotate);
      } else {
        startShowcaseAutoRotate();
      }
    });

    startShowcaseAutoRotate();
  }

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.repeat || sectionNavLocked || isEditableTarget(event.target)) return;

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();

    const activeSectionIndex = getActiveSectionIndex();
    if (activeSectionIndex === -1) return;

    scrollToSectionIndex(activeSectionIndex + (event.key === 'ArrowDown' ? 1 : -1));
  });

  const storyActs = Array.from(document.querySelectorAll('[data-story-act]'));
  const storyVisuals = Array.from(document.querySelectorAll('[data-story-parallax]'));
  const finale = document.querySelector('[data-finale]');

  function setCurrentStoryAct(nextAct) {
    if (!nextAct) return;
    storyActs.forEach((act) => act.classList.toggle('is-current', act === nextAct));
  }

  if (storyActs.length) {
    const storyRatios = new Map(storyActs.map((act, index) => [act, index === 0 ? 1 : 0]));

    const syncCurrentStoryAct = () => {
      const [nextAct] = [...storyRatios.entries()].sort((a, b) => b[1] - a[1])[0] || [];
      setCurrentStoryAct(nextAct || storyActs[0]);
    };

    if ('IntersectionObserver' in window) {
      const storyObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          storyRatios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        syncCurrentStoryAct();
      }, {
        threshold: [0, 0.2, 0.4, 0.6, 0.8],
        rootMargin: '-14% 0px -18% 0px',
      });

      storyActs.forEach((act) => storyObserver.observe(act));
    } else {
      setCurrentStoryAct(storyActs[0]);
    }
  }

  storyVisuals.forEach((visual) => {
    const stack = visual.querySelector('.story-visual-stack');
    if (!stack) return;

    visual.addEventListener('mousemove', (event) => {
      if (window.innerWidth < 900 || reducedMotionQuery.matches) return;

      const rect = visual.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (event.clientX - centerX) / (rect.width / 2);
      const dy = (event.clientY - centerY) / (rect.height / 2);

      stack.style.transform =
        `translate3d(${dx * 10}px, ${dy * 8}px, 0) rotateX(${-dy * 6}deg) rotateY(${dx * 9}deg) rotateZ(${dx * 1.3}deg)`;
    });

    visual.addEventListener('mouseleave', () => {
      stack.style.transform = '';
    });
  });

  if (finale) {
    const toggleFinale = (isLive) => {
      finale.classList.toggle('is-live', isLive);
    };

    const syncFinaleInView = () => {
      toggleFinale(isElementInViewport(finale, 0.18));
    };

    if ('IntersectionObserver' in window) {
      const finaleObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          toggleFinale(entry.isIntersecting && entry.intersectionRatio > 0.28);
        });
      }, { threshold: [0.18, 0.32, 0.56] });

      finaleObserver.observe(finale);
    } else {
      syncFinaleInView();
    }

    window.addEventListener('load', syncFinaleInView, { once: true });
    window.addEventListener('resize', syncFinaleInView, { passive: true });
    window.requestAnimationFrame(syncFinaleInView);
  }

  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    siteNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const id = anchor.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;

      event.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();

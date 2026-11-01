import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUpRight, Check, ChevronDown, Clock3, Menu, Pause, Play, X } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { landingContent } from "../components/marketing/content";
import { experienceContent } from "../components/marketing/experienceContent";
import { demoProject } from "../components/marketing/demoData";
import { GuidedDemo } from "../components/marketing/GuidedDemo";
import { WorkflowProof } from "../components/marketing/WorkflowProof";
import { AccessRequest } from "../components/marketing/AccessRequest";
import { useStickyNavigation } from "../components/marketing/useStickyNavigation";
import { DeferredScene } from "../components/marketing/DeferredScene";
import { NotebookIntro, NotebookSpread } from "../components/marketing/NotebookSpread";
import { getClockSweepState, getRemainingClockSector } from "../components/marketing/clockSweep";
import { SyncEngine } from "../components/marketing/SyncEngine";
import { StudioPricing, ReferenceFolder } from "../components/marketing/StudioPricing";
import { studioContent } from "../components/marketing/studioContent";
import { appLoginUrl } from "../siteConfig";
import "./LandingPage.css";
import "./LandingExperience.css";
import "./LandingStudio.css";

gsap.registerPlugin(ScrollTrigger);
const destinations = ["workflow", "demo", "plans"];

function Brand() {
  return <span className="chrono-brand"><span className="chrono-brand-icon"><Clock3 size={23} strokeWidth={1.7} /></span><span>Chrono<span className="chrono-brand-sync">Sync</span></span></span>;
}

export function LandingPage() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith("hu") ? "hu" : "en";
  const copy = landingContent[language];
  const experience = experienceContent[language];
  const studio = studioContent[language];
  const page = useRef<HTMLDivElement>(null);
  useStickyNavigation(page);
  const clockProgress = useRef(0);
  const laptopProgress = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const staticMotion = paused || reducedMotion;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const oldTitle = document.title;
    const oldLang = document.documentElement.lang;
    document.title = language === "hu" ? "ChronoSync — Az időd. Jó helyen." : "ChronoSync — Your time. Well spent.";
    document.documentElement.lang = language;
    return () => { document.title = oldTitle; document.documentElement.lang = oldLang; };
  }, [language]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);

  useEffect(() => {
    // Native hash navigation can run before the lazy public page has mounted.
    const id = window.location.hash.slice(1);
    if (!["top", "workflow", "demo", "plans", "request-access"].includes(id)) return;
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) document.getElementById(id)?.scrollIntoView({ behavior: "instant" });
    });
    return () => { active = false; };
  }, []);

  useLayoutEffect(() => {
    clockProgress.current = 0;
    laptopProgress.current = staticMotion ? 1 : 0;
    if (staticMotion || !page.current) return;
    const root = page.current;
    const heroSection = root.querySelector<HTMLElement>(".chrono-hero")!;
    const heroStage = root.querySelector<HTMLElement>(".chrono-hero-sticky")!;
    const surface = root.querySelector<HTMLElement>(".chrono-hero-surface")!;
    const clockStage = root.querySelector<HTMLElement>(".chrono-clock-stage")!;
    const invoice = root.querySelector<HTMLElement>(".chrono-hero-sticky > .chrono-invoice")!;
    const landingNote = root.querySelector<HTMLElement>(".chrono-transition-preview .chrono-notebook-invoice")!;
    const sweepHand = root.querySelector<SVGSVGElement>(".chrono-sweep-hand")!;
    const handLines = sweepHand.querySelectorAll("line");
    const handHub = sweepHand.querySelector("circle")!;
    let geometry = { width: 1, height: 1, x: 0, y: 0, radius: 1, minute: 1, noteX: 0, noteY: 0, noteScale: 0.5 };
    const measure = () => {
      const width = heroStage.clientWidth;
      const height = heroStage.clientHeight;
      root.style.setProperty("--chrono-hero-stage-height", `${height}px`);
      const x = clockStage.offsetLeft + clockStage.clientWidth / 2;
      const y = clockStage.offsetTop + clockStage.clientHeight / 2;
      const note = landingNote.getBoundingClientRect();
      const stage = heroStage.getBoundingClientRect();
      geometry = { width, height, x, y,
        radius: Math.max(Math.hypot(x, y), Math.hypot(width - x, y), Math.hypot(x, height - y), Math.hypot(width - x, height - y)) + 60,
        minute: clockStage.clientHeight * 0.91 * 0.93 / (2 * Math.tan(35 * Math.PI / 360) * (7.2 - 0.38)),
        noteX: note.left - stage.left + note.width / 2 - invoice.offsetLeft - invoice.offsetWidth / 2,
        noteY: note.top - stage.top + note.height / 2 - invoice.offsetTop - invoice.offsetHeight / 2,
        noteScale: Math.min(note.width / invoice.offsetWidth, note.height / invoice.offsetHeight),
      };
      sweepHand.setAttribute("viewBox", `0 0 ${width} ${height}`);
    };
    const drawSweep = () => {
      const state = getClockSweepState(clockProgress.current);
      const { width, height, x, y, radius, minute } = geometry;
      surface.style.clipPath = getRemainingClockSector(width, height, x, y, state.sweep);
      surface.style.setProperty("--chrono-minute-angle", `${state.minuteAngle}rad`);
      surface.style.setProperty("--chrono-minute-opacity", String(clockProgress.current < 0.3 ? 1 - state.handOpacity : 0));
      const length = minute + (radius - minute) * state.extension;
      handLines.forEach(line => {
        line.setAttribute("x1", String(x)); line.setAttribute("y1", String(y));
        line.setAttribute("x2", String(x + Math.sin(state.minuteAngle) * length));
        line.setAttribute("y2", String(y - Math.cos(state.minuteAngle) * length));
      });
      handHub.setAttribute("cx", String(x)); handHub.setAttribute("cy", String(y));
      sweepHand.style.opacity = String(state.handOpacity);
    };
    measure();
    let media: ReturnType<typeof gsap.matchMedia> | undefined;
    const context = gsap.context(() => {
      // This decorative copy matches the real section exactly at the handoff.
      // Keeping the real notebook in normal flow also preserves mobile reading.
      gsap.set(".chrono-story", { autoAlpha: 0 });
      gsap.set(surface, { clipPath: "none" });
      gsap.set(sweepHand, { opacity: 0 });
      const hero = gsap.timeline({ scrollTrigger: {
        trigger: heroSection, start: "top top", end: () => `+=${Math.max(1, heroSection.offsetHeight - heroStage.offsetHeight)}`,
        scrub: 0.16, invalidateOnRefresh: true,
      } });
      hero.to(clockProgress, { current: 1, duration: 1, ease: "none", onUpdate: drawSweep }, 0)
        .to(".chrono-hero-copy", { y: -48, duration: 0.4, ease: "power1.inOut" }, 0.2)
        .to(".chrono-hero-copy", { opacity: 0, duration: 0.12 }, 0.64)
        .to(".chrono-timer-tag", { y: -18, opacity: 0, duration: 0.13 }, 0.23)
        .to(".chrono-hero-bottom", { opacity: 0, duration: 0.13 }, 0.2)
        .to(invoice, { y: -8, rotation: 3, duration: 0.2, ease: "power1.inOut" }, 0.03)
        .fromTo(".chrono-invoice-line", { scaleX: 0.15, opacity: 0.4 }, { scaleX: 1, opacity: 1, stagger: 0.04, duration: 0.15 }, 0.04)
        .fromTo(".chrono-invoice-status", { opacity: 0.3 }, { opacity: 1, duration: 0.12 }, 0.16)
        .to(invoice, { x: () => geometry.noteX, y: () => geometry.noteY, scale: () => geometry.noteScale,
          rotation: -4, duration: 0.38, ease: "power2.inOut" }, 0.48)
        .to(invoice, { opacity: 0, duration: 0.1 }, 0.87)
        .fromTo(".chrono-transition-preview .chrono-notebook-invoice", { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0.84)
        .fromTo(".chrono-transition-preview .chrono-feature-check", { scale: 0.7, opacity: 0.4 }, { scale: 1, opacity: 1, stagger: 0.04, duration: 0.14 }, 0.43)
        .fromTo(".chrono-transition-preview .chrono-sticky-note", { opacity: 0, rotation: 1 }, { opacity: 1, rotation: 6, duration: 0.16 }, 0.7)
        .fromTo(".chrono-transition-preview .chrono-feature-ink", { scaleX: 0 }, { scaleX: 1, stagger: 0.06, duration: 0.16, ease: "power1.inOut" }, 0.48)
        .fromTo(".chrono-transition-preview .chrono-feature-check svg path", { strokeDasharray: 34, strokeDashoffset: 34 }, { strokeDashoffset: 0, stagger: 0.06, duration: 0.12 }, 0.5)
        .set(".chrono-story", { autoAlpha: 1 }, 1);

      media = gsap.matchMedia();
      media.add("(min-width: 900px)", () => {
        laptopProgress.current = 0;
        const story = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".chrono-story", start: "top top", end: "bottom bottom", scrub: 0.16 } });
        // Fold into one centered silhouette before handing the paper to WebGL.
        story.to(".chrono-story .chrono-notebook-page--left", { rotateY: -180, transformOrigin: "right center", duration: 0.27, ease: "power1.inOut" }, 0.08)
          .to(".chrono-story .chrono-notebook-cover", { left: "50%", duration: 0.27, ease: "power1.inOut" }, 0.08)
          .to(".chrono-story .chrono-notebook-spine, .chrono-story .chrono-notebook-stationery, .chrono-story .chrono-notebook-bookmark", { opacity: 0, duration: 0.16 }, 0.12)
          .to(".chrono-story .chrono-notebook", { xPercent: -19, scale: 0.76, rotation: 0, rotateX: 80, y: -25, duration: 0.3, ease: "power1.inOut" }, 0.12)
          .to(".chrono-story .chrono-notebook-cover", { backgroundColor: "#849074", duration: 0.24 }, 0.18)
          .to(".chrono-story .chrono-notebook-header", { opacity: 0, y: -10, duration: 0.14 }, 0.29)
          .fromTo(".chrono-story .chrono-laptop-stage", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, 0.4)
          .to(".chrono-story .chrono-notebook", { autoAlpha: 0, duration: 0.08 }, 0.4)
          .to(laptopProgress, { current: 1, duration: 0.4 }, 0.42)
          .fromTo(".chrono-story .chrono-laptop-header", { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.07 }, 0.41)
          .fromTo(".chrono-story .chrono-demo-controls", { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.12 }, 0.74)
          .to({}, { duration: 0.14 }, 0.86);
      });
      media.add("(max-width: 899px)", () => {
        gsap.fromTo(laptopProgress, { current: 0 }, { current: 1, ease: "none", scrollTrigger: {
          trigger: ".chrono-story .chrono-laptop-stage", start: "top 92%", end: "center 62%", scrub: 0.15,
        } });
        gsap.utils.toArray<HTMLElement>(".chrono-story .chrono-feature-check, .chrono-story .chrono-sticky-note").forEach((element) => {
          gsap.from(element, { y: 10, opacity: 0.65, duration: 0.35, scrollTrigger: { trigger: element, start: "top 94%", once: true } });
        });
      });

      gsap.utils.toArray<HTMLElement>(".chrono-reveal").forEach((element) => {
        gsap.from(element, { y: 20, opacity: 0, duration: 0.4, ease: "power2.out", scrollTrigger: { trigger: element, start: "top 92%", once: true } });
      });
      gsap.from(".chrono-demo-window", { y: 24, scale: 0.97, transformOrigin: "center top", ease: "none", scrollTrigger: { trigger: ".chrono-guided-demo", start: "top 88%", end: "top 42%", scrub: 0.15 } });
      gsap.utils.toArray<HTMLElement>(".chrono-workbench-heading, .chrono-workbench-roles > h3, .chrono-role-stop, .chrono-studio-pricing-heading, .chrono-reference-file, .chrono-access-intro > h2, .chrono-access-form").forEach(element => {
        gsap.fromTo(element, { y: 18, opacity: 0.7 }, { y: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: element, start: "top 95%", end: "top 75%", scrub: 0.15 } });
      });
      gsap.fromTo(".chrono-document-seal", { rotation: -22, scale: 1.35, opacity: 0 }, { rotation: -7, scale: 1, opacity: 1, ease: "back.out(1.5)", scrollTrigger: { trigger: ".chrono-document-stage", start: "top 48%", toggleActions: "play none none reverse" } });
      gsap.fromTo(".chrono-role-trail", { "--trail-progress": 0 }, { "--trail-progress": 1, ease: "none", scrollTrigger: { trigger: ".chrono-role-trail", start: "top 80%", end: "bottom 60%", scrub: 0.15 } });
      gsap.to(".chrono-pricing-fold", { scaleY: 0, ease: "power1.inOut", scrollTrigger: { trigger: ".chrono-studio-pricing", start: "top 80%", end: "top 30%", scrub: 0.15 } });
      gsap.utils.toArray<HTMLElement>(".chrono-sculptural-plan").forEach((element, index) => {
        gsap.from(element, { y: index === 1 ? 30 : 18, ease: "none", scrollTrigger: { trigger: element, start: "top 95%", end: "top 65%", scrub: 0.15 } });
      });
      gsap.fromTo(".chrono-scroll-progress", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: page.current, start: "top top", end: "bottom bottom", scrub: true } });
    }, page);
    const resize = new ResizeObserver(() => { measure(); drawSweep(); });
    resize.observe(heroStage);
    resize.observe(landingNote);
    ScrollTrigger.addEventListener("refreshInit", measure);
    let mounted = true;
    document.fonts.ready.then(() => { if (mounted) ScrollTrigger.refresh(); });
    return () => {
      mounted = false;
      resize.disconnect();
      ScrollTrigger.removeEventListener("refreshInit", measure);
      media?.revert();
      context.revert();
      surface.style.removeProperty("clip-path");
      surface.style.removeProperty("--chrono-minute-angle");
      surface.style.removeProperty("--chrono-minute-opacity");
      root.style.removeProperty("--chrono-hero-stage-height");
    };
  }, [staticMotion, language]);

  return <div ref={page} className={`chrono-site ${staticMotion ? "chrono-static" : ""}`} lang={language}>
    <a className="chrono-skip" href="#workflow">{copy.skip}</a>
    <header className="chrono-nav">
      <a href="#top" aria-label="ChronoSync" onClick={() => setMenuOpen(false)}><Brand /></a>
      <nav className={`chrono-nav-links ${menuOpen ? "is-open" : ""}`} aria-label={copy.menu} id="chrono-navigation">
        {copy.nav.map((label, index) => <a key={label} href={`#${destinations[index]}`} onClick={() => setMenuOpen(false)}>{label}<span /></a>)}
        <a className="chrono-mobile-login" href={appLoginUrl}>{copy.signIn}<ArrowUpRight size={16} /></a>
      </nav>
      <div className="chrono-nav-actions">
        <button className="chrono-language" onClick={() => void i18n.changeLanguage(language === "en" ? "hu" : "en")} aria-label={copy.language}>{language.toUpperCase()}<ChevronDown size={12} /></button>
        <a href={appLoginUrl} className="chrono-login">{copy.signIn}<ArrowUpRight size={16} /></a>
        <a href="#request-access" className="chrono-button chrono-button--small">{experience.request}<ArrowUpRight size={16} /></a>
        <button className="chrono-menu" aria-label={copy.menu} aria-controls="chrono-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      <div className="chrono-scroll-progress" />
    </header>

    <main id="top">
      <section className="chrono-hero" aria-labelledby="chrono-hero-title">
        <div className="chrono-hero-sticky">
          <div className="chrono-story-sticky chrono-transition-preview" aria-hidden="true" inert>
            <NotebookIntro copy={copy} />
            <div className="chrono-object-stage"><NotebookSpread copy={copy} experience={experience} /></div>
          </div>
          <div className="chrono-hero-surface">
          <div className="chrono-grid" aria-hidden="true" />
          <span className="chrono-coordinate chrono-coordinate--one" aria-hidden="true">+</span><span className="chrono-coordinate chrono-coordinate--two" aria-hidden="true">+</span>
          <div className="chrono-hero-copy">
            <h1 id="chrono-hero-title"><span>{copy.heroLine1}</span><em>{copy.heroLine2}<svg viewBox="0 0 500 30" preserveAspectRatio="none" aria-hidden="true"><path d="M3 21Q210-7 492 14M40 28Q270 5 470 23" /></svg></em></h1>
            <p className="chrono-hero-intro">{experience.proposition}</p>
            <div className="chrono-hero-actions"><a className="chrono-button" href="#request-access">{experience.request}<ArrowUpRight size={19} /></a><a href="#demo" className="chrono-text-link"><span className="chrono-play-icon"><Play size={11} fill="currentColor" /></span>{experience.tryDemo}</a></div>
          </div>
          <div className="chrono-clock-stage" role="img" aria-label={copy.fallback}>
            <div className="chrono-clock-shadow" />
            <DeferredScene kind="clock" progress={clockProgress} paused={staticMotion} staticFallback={reducedMotion} />
            <div className="chrono-timer-tag"><span className="chrono-timer-icon"><Play size={13} fill="currentColor" /></span><div><span>{demoProject.client} · {demoProject.project}</span><strong>02:00:00</strong></div><span className="chrono-timer-bars" aria-hidden="true"><i /><i /><i /><i /></span></div>
          </div>
          <div className="chrono-hero-bottom"><a href="#workflow" aria-label={experience.skipAnimation}><ArrowDown size={17} /></a></div>
          </div>
            <div className="chrono-invoice" aria-hidden="true"><div className="chrono-invoice-content">
              <div className="chrono-invoice-top"><Clock3 size={17} /><span>{copy.invoice}</span><ArrowUpRight size={14} /></div>
              <h3>{demoProject.client}</h3>
              <div className="chrono-invoice-line"><span>24.0 h</span><span>€ 75.00 / h</span></div>
              <div className="chrono-invoice-line chrono-invoice-total"><span>{copy.invoiceTotal}</span><strong>€ 1,800.00</strong></div>
              <span className="chrono-invoice-status"><Check size={11} />{copy.invoiceReady}</span>
              <span className="chrono-invoice-note">{copy.invoiceNote}</span>
            </div></div>
          <svg className="chrono-sweep-hand" aria-hidden="true" preserveAspectRatio="none"><line className="chrono-sweep-hand-shadow" /><line className="chrono-sweep-hand-edge" /><circle r="5" /></svg>
        </div>
      </section>

      <section className="chrono-story" id="why-chrono" aria-labelledby="chrono-story-title">
        <span id="workflow" className="chrono-workflow-anchor" />
        <div className="chrono-story-sticky">
          <NotebookIntro copy={copy} id="chrono-story-title" />
          <div className="chrono-story-header chrono-laptop-header"><h2>{copy.laptopTitle1}<br /><em>{copy.laptopTitle2}</em></h2></div>
          <div className="chrono-object-stage">
            <NotebookSpread copy={copy} experience={experience} />
            <div className="chrono-laptop-stage" role="img" aria-label={copy.laptopFallback}>
              <div className="chrono-laptop-shadow" />
              <DeferredScene kind="laptop" progress={laptopProgress} paused={staticMotion} staticFallback={reducedMotion} />
            </div>
          </div>
          <div className="chrono-demo-controls"><a href="#demo" className="chrono-text-link">{experience.launchDemo}<ArrowDown size={16} /></a></div>
        </div>
      </section>

      <GuidedDemo copy={experience} language={language} />
      <SyncEngine copy={studio} paused={staticMotion} language={language} />
      <WorkflowProof copy={experience} studio={studio} paused={staticMotion} language={language} />
      <StudioPricing copy={copy} experience={experience} paused={staticMotion} language={language} onSelect={setSelectedPlan} />
      <ReferenceFolder copy={copy} studio={studio} paused={staticMotion} language={language} />
      <AccessRequest copy={experience} language={language} plan={selectedPlan} paused={staticMotion} />
    </main>
    <footer className="chrono-footer"><a href="#top" aria-label="ChronoSync"><Brand /></a><span>© {new Date().getFullYear()} ChronoSync</span><a href="#top">{copy.top}<ArrowUpRight size={14} /></a></footer>
    <button className="chrono-motion-toggle" onClick={() => setPaused(!paused)} aria-label={staticMotion ? copy.play : copy.pause} aria-pressed={staticMotion} disabled={reducedMotion} title={staticMotion ? copy.play : copy.pause}>{staticMotion ? <Play size={13} /> : <Pause size={13} />}</button>
  </div>;
}

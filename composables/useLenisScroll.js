import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";

export const useLenisScroll = () => {
  return {
    lenisInitial() {
      gsap.registerPlugin(ScrollTrigger);

      window.lenis = new Lenis({
        wrapper: window,
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: "vertical",
        gestureDirection: "vertical",
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
      });

      window.lenis.on("scroll", ScrollTrigger.update);

      function raf(time) {
        window.lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    },
  };
};

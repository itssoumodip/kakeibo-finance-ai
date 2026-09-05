// Entrance animations are now pure CSS (see .gsap-card/.gsap-item in index.css).
// CSS animations start at first paint with `both` fill mode, so there is no
// visible→hidden→visible flicker that the old JS-driven fade caused on every
// navigation (it looked like pages "reloading"). These exports stay as no-ops
// so no page imports need to change. The gsap dependency is gone.
export const pageIn = (_el: HTMLElement | string) => {};
export const staggerCards = (_container: HTMLElement | null, _selector = '.gsap-card') => {};
export const staggerList = (_container: HTMLElement | null, _selector = '.gsap-item') => {};

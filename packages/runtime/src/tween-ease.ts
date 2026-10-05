import {
  DEFAULT_TWEEN_EASE,
  type TweenEaseName,
} from "@game-editor/game-components";
import { Easing } from "@tweenjs/tween.js";

type EasingFn = (amount: number) => number;

const EASING: Record<TweenEaseName, EasingFn> = {
  linear: Easing.Linear.None,
  "power1.in": Easing.Quadratic.In,
  "power1.out": Easing.Quadratic.Out,
  "power1.inOut": Easing.Quadratic.InOut,
  "power2.in": Easing.Cubic.In,
  "power2.out": Easing.Cubic.Out,
  "power2.inOut": Easing.Cubic.InOut,
  "power3.in": Easing.Quartic.In,
  "power3.out": Easing.Quartic.Out,
  "power3.inOut": Easing.Quartic.InOut,
  "power4.in": Easing.Quintic.In,
  "power4.out": Easing.Quintic.Out,
  "power4.inOut": Easing.Quintic.InOut,
  "sine.in": Easing.Sinusoidal.In,
  "sine.out": Easing.Sinusoidal.Out,
  "sine.inOut": Easing.Sinusoidal.InOut,
  "expo.in": Easing.Exponential.In,
  "expo.out": Easing.Exponential.Out,
  "expo.inOut": Easing.Exponential.InOut,
  "circ.in": Easing.Circular.In,
  "circ.out": Easing.Circular.Out,
  "circ.inOut": Easing.Circular.InOut,
  "back.in": Easing.Back.In,
  "back.out": Easing.Back.Out,
  "back.inOut": Easing.Back.InOut,
  "elastic.in": Easing.Elastic.In,
  "elastic.out": Easing.Elastic.Out,
  "elastic.inOut": Easing.Elastic.InOut,
  "bounce.in": Easing.Bounce.In,
  "bounce.out": Easing.Bounce.Out,
  "bounce.inOut": Easing.Bounce.InOut,
};

export function tweenEasing(name: TweenEaseName): EasingFn {
  return EASING[name] ?? EASING[DEFAULT_TWEEN_EASE];
}

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Path, Defs, Mask } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
  runOnJS,
  useReducedMotion,
  useAnimatedProps,
} from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export interface PlanevoMobileLoaderProps {
  size?: number;
  mode?: 'loading' | 'complete';
  onAnimationFinished?: () => void;
  backgroundColor?: string;
  color?: string;
}

export const PlanevoMobileLoader = ({
  size = 100,
  mode = 'loading',
  onAnimationFinished,
  backgroundColor = '#111113',
  color = '#ffffff',
}: PlanevoMobileLoaderProps) => {
  const reducedMotion = useReducedMotion();
  
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const checkDashOffset = useSharedValue(600);
  const opacity = useSharedValue(reducedMotion ? 0.4 : 1);

  const [checkVisible, setCheckVisible] = useState(false);

  useEffect(() => {
    if (mode === 'loading') {
      if (reducedMotion) {
        // Reduced motion: fade in and out instead of spinning
        opacity.value = withRepeat(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      } else {
        // Normal motion: spin continuous
        rotation.value = withRepeat(
          withTiming(360, { duration: 1100, easing: Easing.linear }),
          -1,
          false
        );
      }
    } else if (mode === 'complete') {
      // Stop repeating animations smoothly
      cancelAnimation(rotation);
      cancelAnimation(opacity);
      
      setCheckVisible(true);

      if (reducedMotion) {
        opacity.value = withTiming(1, { duration: 200 });
        checkDashOffset.value = 0; // instantly visible
        if (onAnimationFinished) {
          setTimeout(onAnimationFinished, 300);
        }
      } else {
        // 350ms snappy draw — confident pen stroke feel (matches industry standard)
        checkDashOffset.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.back(1)) }, (finished) => {
          if (finished && onAnimationFinished) {
            runOnJS(onAnimationFinished)();
          }
        });
        
        // 250ms spring overshoot pop — gives the satisfying 'done!' feel
        scale.value = withSequence(
          withTiming(1.1, { duration: 160, easing: Easing.out(Easing.back(2)) }),
          withTiming(1, { duration: 160, easing: Easing.in(Easing.ease) })
        );
      }
    }
  }, [mode, reducedMotion, rotation, checkDashOffset, scale, opacity, onAnimationFinished]);

  const animatedSpinStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: 510 },
        { translateY: 510 },
        { rotate: `${rotation.value}deg` },
        { translateX: -510 },
        { translateY: -510 },
      ],
      opacity: opacity.value,
    };
  });

  const animatedScaleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedMaskProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: checkDashOffset.value,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <AnimatedSvg
        width={size * 1.2}
        height={size * 1.2}
        viewBox="260 260 500 500"
        style={animatedScaleStyle}
      >
        <AnimatedG style={animatedSpinStyle}>
          {/* Main Planevo circle paths */}
          <Path fill={color} d="M540.661 292.702C561.681 291.306 582.503 297.513 599.326 310.192C619.864 325.408 631.341 345.26 635.022 370.411C626.97 376.673 621.514 383.383 611.868 385.887C612.887 369.679 609.722 355.259 599.542 342.24C558.952 290.331 484.871 322.575 477.116 382.714C473.296 412.334 489.651 443.85 507.755 466.768C506.592 470.675 505.912 473.553 505.088 477.556C501.02 474.165 496.4 470.56 492.149 467.387C458.146 442.01 403.08 399.444 358.607 415.94C342.444 421.763 329.303 433.844 322.145 449.462C315.323 464.707 314.917 482.054 321.016 497.602C328.479 516.639 343.219 531.917 361.975 540.059C386.33 550.701 408.018 546.682 431.65 537.422C437.292 543.063 444.157 550.952 449.255 557.14C428.616 587.138 401.181 630.531 417.497 667.998C431.596 700.376 469.642 716.681 502.533 701.919C521.535 693.352 536.37 677.607 543.794 658.13C544.242 656.99 544.637 655.83 544.978 654.654C553.211 627.127 544.162 600.858 531.126 576.671C535.046 571.868 537.945 568.073 541.507 563.007C543.771 564.623 545.968 566.539 548.186 568.242C563.308 579.848 579.509 590.14 595.407 600.669C599.21 608.218 602.171 616.208 605.254 624.083C594.634 621.411 577.484 610.706 567.687 605.435C568.377 607.951 568.836 610.577 569.295 613.149C574.312 639.754 568.478 667.259 553.094 689.537C538.139 710.777 518.819 725.74 492.754 730.168C469.683 733.924 446.065 728.377 427.078 714.744C407.385 700.81 394.083 679.579 390.134 655.781C384.887 622.615 398.532 592.119 417.461 565.89C413.601 566.927 409.435 567.882 405.51 568.606C357.172 577.52 302.193 539.099 293.778 490.835C289.836 468.249 295.217 445.031 308.692 426.482C326.951 400.82 356.932 385.704 388.374 388.976C411.473 391.38 437.965 404.314 456.667 417.821C455.42 412.762 454.523 406.24 454.018 401.035C451.448 374.275 459.775 347.61 477.115 327.067C494.283 306.383 513.911 295.279 540.661 292.702Z" />
          <Path fill={color} d="M693.726 515.86C698.367 521.68 701.46 532.22 703.598 539.266C695.991 546.972 687.305 553.534 677.813 558.745C656.166 570.438 630.748 573.011 607.196 565.893C610.981 571.743 614.878 578.159 618.682 584.005C657.291 643.339 629.506 719.558 557.371 730.899C543.581 733.067 532.607 730.46 519.231 727.022C524.658 723.65 529.005 720.709 534.187 716.978C538.422 713.74 540.981 711.262 544.753 707.551C560.027 707.705 573.785 704.243 586.043 695.038C598.848 685.421 609.753 669.668 611.439 653.458C614.834 620.799 601.514 597.769 584.762 572.199C577.158 560.462 569.078 549.041 560.542 537.963C563.544 533.986 566.643 530.083 569.835 526.257C596.554 539.685 624.769 552.816 655.065 543.186C670.759 538.197 683.693 528.816 693.726 515.86Z" />
          <Path fill={color} d="M624.806 454.223C634.04 453.769 643.294 454.456 652.359 456.269C679.529 461.739 703.395 477.821 718.667 500.95C731.503 520.506 735.224 542.704 730.32 565.489C725.395 587.47 712.078 606.658 693.207 618.961C683.964 624.908 659.32 636.632 648.46 634.256C646.82 632.848 647.316 633.055 646.709 630.433C645.143 623 643.891 618.691 641.212 611.581C646.453 611.446 651.668 610.803 656.785 609.66C675.489 605.492 689.954 595.176 699.678 579.076C729.413 529.839 679.718 473.568 627.783 476.602C619.204 477.103 613.735 478.105 605.607 479.981C611.286 471.792 618.738 462.233 624.806 454.223Z" />
          <Path fill={color} d="M464.86 575.866C470.02 581.217 478.767 592.504 483.925 598.742C469.269 635.965 476.712 668.885 508.713 693.762C501.388 698.031 493.585 701.421 485.466 703.864C480.203 699.562 473.523 690.171 469.443 684.434C453.042 658.215 451.044 634.522 456.901 604.938C446.091 612.184 431.372 619.263 419.361 624.224C422.483 615.478 425.042 608.84 431.955 602.267C442.124 592.598 453.369 583.903 464.86 575.866Z" />
          <Path fill={color} d="M398.621 419.566C400.061 419.928 401.495 420.313 402.922 420.721C410.292 422.838 423.315 426.9 427.973 433.17C429.892 435.754 432.207 440.242 433.841 443.224L444.573 462.522L414.185 478.723C409.152 477.795 404.066 477.178 398.957 476.874C376.746 475.72 356.293 482.506 339.741 497.414C336.051 500.836 334.001 503.268 331.125 507.32C326.458 501.028 323.588 490.423 321.191 482.883C325.798 478.609 330.763 474.736 336.03 471.308C361.367 454.597 387.745 450.608 417.181 456.704C411.792 447.086 400.893 429.924 398.621 419.566Z" />
          <Path fill={color} d="M540.294 320.52C542.795 321.29 553.308 335.739 555.129 338.56C571.578 364.046 573.912 388.938 567.797 417.899C577.491 411.812 585.108 407.519 595.714 403.17C581.789 416.841 564.327 431.562 549.7 445.38C542.842 451.387 535.836 459.595 529.601 464.8L528.77 464.408C527.724 460.64 544.194 419.005 546.121 410.493C548.239 400.974 548.742 391.167 547.61 381.482C544.981 360.235 532.929 343.347 516.373 330.431C523.786 325.67 531.994 323.195 540.294 320.52Z" />
          <Path fill={color} d="M476.192 292.715C486.51 292.296 496.85 294.36 506.805 296.812C494.831 302.929 488.414 306.589 478.833 316.43C442.037 317.028 415.944 341.98 413.008 378.528L412.989 386.821C404.341 383.398 398.345 381.828 389.223 380.301C390.738 330.544 427.13 295.735 476.192 292.715Z" />
          <Path fill={color} d="M297.671 517.245C299.61 518.908 304.407 527.202 306.38 529.98C310.106 535.225 311.915 537.27 316.599 541.796C316.545 543.203 316.515 544.611 316.508 546.019C316.437 584.126 347.313 611.516 384.617 611.491C381.871 619.775 380.512 626.287 378.735 634.788C372.17 635.159 363.262 632.735 356.969 630.87C317.026 619.038 289.865 581.337 292.656 539.576C293.182 531.703 295.172 524.773 297.671 517.245Z" />
          <Path fill={color} d="M671.472 392.627C673.374 393.219 676.237 394.419 678.09 395.209C700.153 404.836 717.512 422.801 726.377 445.181C733.462 462.891 735.367 487.654 727.691 505.425C726.231 503.566 724.885 501.253 723.62 499.227C718.602 491.27 715.589 487.525 708.94 480.846C708.73 466.948 707.617 458.098 700.682 445.663C691.5 429.197 674.558 417.905 656.625 412.941C660.488 406.998 667.154 398.268 671.472 392.627Z" />
        </AnimatedG>

        {checkVisible && (
          <>
            <Defs>
              <Mask id="checkMask">
                <AnimatedPath
                  d="M390 500 L500 610 L710 320"
                  stroke="white"
                  strokeWidth={100}
                  fill="transparent"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={600}
                  animatedProps={animatedMaskProps}
                />
              </Mask>
            </Defs>
            <Path
              fill="#AF854E"
              mask="url(#checkMask)"
              d="M694.402 337.06L694.597 337.514C690.326 343.853 685.136 350.184 680.49 356.36L647.675 399.662L556.725 519.13C537.79 543.755 517.652 569.241 499.312 594.198C492.501 587.5 486.702 579.558 480.561 572.241C465.831 554.693 453.026 535.578 435.186 520.993L405.346 499.396C424.263 489.352 444.744 479.849 463.38 469.497C466.359 472.761 470.929 479.096 473.832 482.712C482.743 493.813 491.443 505.235 501.272 515.568C512.453 502.042 526.623 488.431 538.972 475.971C567.642 447.04 598.393 420.734 629.057 393.949L669.788 358.315C677.467 351.572 686.448 343.269 694.402 337.06Z"
            />
          </>
        )}
      </AnimatedSvg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

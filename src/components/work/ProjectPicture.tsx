import type { CSSProperties, Ref } from "react";
import type { Picture } from "./media";

interface Props {
  picture: Picture;
  alt: string;
  sizes: string;
  className?: string;
  imgClassName?: string;
  /** "eager" and high priority for the page's header image; lazy everywhere else. */
  priority?: boolean;
  imgRef?: Ref<HTMLImageElement>;
  style?: CSSProperties;
}

/**
 * A plain <picture> (AVIF, then WebP), never next/image (it would need the OpenNext image loader). The
 * blurred placeholder sits behind the image until it loads.
 */
export function ProjectPicture({ picture, alt, sizes, className, imgClassName, priority, imgRef, style }: Props) {
  return (
    <picture className={className} style={{ backgroundImage: `url("${picture.placeholder}")`, backgroundSize: "cover", ...style }}>
      <source type="image/avif" srcSet={picture.avif} sizes={sizes} />
      <source type="image/webp" srcSet={picture.webp} sizes={sizes} />
      <img
        ref={imgRef}
        src={picture.src}
        alt={alt}
        width={picture.width}
        height={picture.height}
        className={imgClassName}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
      />
    </picture>
  );
}

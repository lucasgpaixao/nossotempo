import Image from "next/image";
import logoFull from "../../public/brand/logo-full.png";
import logoIcon from "../../public/brand/icon-512.png";

export function Logo({
  className,
  height = 36,
  priority,
}: {
  className?: string;
  height?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src={logoFull}
      alt="Nosso Tempo"
      height={height}
      className={className}
      style={{ width: "auto", height }}
      priority={priority}
    />
  );
}

export function LogoIcon({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src={logoIcon}
      alt=""
      width={size}
      height={size}
      className={className}
    />
  );
}

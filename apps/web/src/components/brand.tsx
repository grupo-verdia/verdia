import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">v</span>
      <span>verdia</span>
      <small>× MOTIVA</small>
    </Link>
  );
}

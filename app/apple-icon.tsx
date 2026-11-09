import { ImageResponse } from "next/og";
import { DialMark } from "@/components/dial-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<DialMark size={180} />, size);
}

import { ImageResponse } from "next/og";
import { DialMark } from "@/components/dial-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<DialMark size={32} />, size);
}

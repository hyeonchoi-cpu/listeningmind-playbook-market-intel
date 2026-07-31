import { redirect } from "next/navigation";

// 가전 전용 웹 — 산업 인덱스는 제공하지 않는다.
export default function IndustriesIndex() {
  redirect("/industries/appliance");
}

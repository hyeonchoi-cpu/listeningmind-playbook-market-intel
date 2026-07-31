import { redirect } from "next/navigation";

// 가전 카탈로그 전용 웹 — 루트는 가전 카탈로그로 직행한다.
export default function Home() {
  redirect("/industries/appliance");
}

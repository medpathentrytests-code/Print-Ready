"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function InspectionsChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F8" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={24} />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: "1px solid #E7EAF3", fontSize: 12 }}
          labelStyle={{ fontWeight: 600, color: "#0B1220" }}
        />
        <Area type="monotone" dataKey="count" stroke="#7C5CFF" strokeWidth={2} fill="url(#colorCount)" name="Inspections" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

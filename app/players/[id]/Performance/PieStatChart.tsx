"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from "recharts";
import { motion } from "framer-motion";

interface PieStatChartProps {
  W: number;
  L: number;
  height?: number;
}

/**
 * Grafico a torta animato con percentuale al centro
 * e numeri Wins/Losses esterni.
 */
export default function PieStatChart({ W, L, height = 200 }: PieStatChartProps) {
  const total = W + L;
  const winPct = total ? (W / total) * 100 : 0;

  const data = [
    { name: "Wins", value: W },
    { name: "Losses", value: L },
  ];

  const COLORS = ["#22c55e", "#ef4444"]; // verde e rosso

  return (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={2}
            stroke="none"
            isAnimationActive
            labelLine={true}
            label={({ name, value }) => `${name}: ${value}`}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index]}
                className="drop-shadow-md"
              />
            ))}
            {/* Percentuale centrale */}
            <Label
              value={`${winPct.toFixed(2)}%`}
              position="center"
              className="text-xl font-bold text-gray-900 dark:text-gray-100"
            />
          </Pie>

          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(30,41,59,0.9)",
              border: "none",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "0.85rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
            itemStyle={{ color: "#f8fafc" }}
            formatter={(value, name) => [`${value}`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

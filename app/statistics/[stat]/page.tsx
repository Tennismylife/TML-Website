import { Suspense } from "react";
import type { Metadata } from 'next'
import StatisticsInner from "../StatisticsInner";

const STAT_LABELS: Record<string, string> = {
  aces: "Most Aces",
  df: "Most Double Faults",
  "1stserve": "Best 1st Serve Percentage",
  "1stservewon": "Best 1st Serve Won Percentage",
  "2ndservewon": "Best 2nd Serve Won Percentage",
  servicewon: "Best Service Points Won Percentage",
  bpsaved: "Best Break Points Saved Percentage",
  bpwon: "Best Break Points Won Percentage",
  "1streturnwon": "Best 1st Serve Return Won Percentage",
  "2ndreturnwon": "Best 2nd Serve Return Won Percentage",
  returnwon: "Best Return Points Won Percentage",
  totalpoints: "Most Points Played",
  totalpointswon: "Most Points Won",
  totalpointswonpct: "Best Points Won Percentage",
  totalgames: "Most Games Played",
  totalgameswon: "Most Games Won",
  gameswonpct: "Best Games Won Percentage",
  tiebreaksplayed: "Most Tiebreaks Played",
  tiebreakswon: "Most Tiebreaks Won",
  tiebreakswonpct: "Best Tiebreaks Won Percentage",
  setsplayed: "Most Sets Played",
  setswon: "Most Sets Won",
  setswonpct: "Best Sets Won Percentage",
  totalminutes: "Most Minutes",
  avgminutes: "Highest Average Minutes per Match",
};

const STAT_PROPERTY_NAMES: Record<string, string> = {
  aces: "Career Aces",
  df: "Career Double Faults",
  "1stserve": "1st Serve Percentage",
  "1stservewon": "1st Serve Won Percentage",
  "2ndservewon": "2nd Serve Won Percentage",
  servicewon: "Service Points Won Percentage",
  bpsaved: "Break Points Saved Percentage",
  bpwon: "Break Points Won Percentage",
  "1streturnwon": "1st Serve Return Won Percentage",
  "2ndreturnwon": "2nd Serve Return Won Percentage",
  returnwon: "Return Points Won Percentage",
  totalpoints: "Career Points Played",
  totalpointswon: "Career Points Won",
  totalpointswonpct: "Points Won Percentage",
  totalgames: "Career Games Played",
  totalgameswon: "Career Games Won",
  gameswonpct: "Games Won Percentage",
  tiebreaksplayed: "Career Tiebreaks Played",
  tiebreakswon: "Career Tiebreaks Won",
  tiebreakswonpct: "Tiebreaks Won Percentage",
  setsplayed: "Career Sets Played",
  setswon: "Career Sets Won",
  setswonpct: "Sets Won Percentage",
  totalminutes: "Career Minutes Played",
  avgminutes: "Average Minutes per Match",
};

const STAT_UNIT_TEXTS: Record<string, string> = {
  aces: "aces",
  df: "double faults",
  "1stserve": "percent",
  "1stservewon": "percent",
  "2ndservewon": "percent",
  servicewon: "percent",
  bpsaved: "percent",
  bpwon: "percent",
  "1streturnwon": "percent",
  "2ndreturnwon": "percent",
  returnwon: "percent",
  totalpoints: "points",
  totalpointswon: "points",
  totalpointswonpct: "percent",
  totalgames: "games",
  totalgameswon: "games",
  gameswonpct: "percent",
  tiebreaksplayed: "tiebreaks",
  tiebreakswon: "tiebreaks",
  tiebreakswonpct: "percent",
  setsplayed: "sets",
  setswon: "sets",
  setswonpct: "percent",
  totalminutes: "minutes",
  avgminutes: "minutes per match",
};

// FAQ per ogni statistica
const STAT_FAQS: Record<string, Array<{ question: string; answer: string }>> = {
  aces: [
    {
      question: "Who has the most aces in tennis history?",
      answer: "Ivo Karlović holds the record for most career aces in men's professional tennis with over 13,700 aces throughout his career."
    },
    {
      question: "How are aces counted in tennis statistics?",
      answer: "An ace is counted when a serve is hit in such a way that the opponent cannot touch the ball with their racket, resulting in an immediate point for the server."
    },
    {
      question: "Which surface produces the most aces?",
      answer: "Grass courts typically produce the most aces due to the faster surface speed and lower bounce, making it harder for returners to react."
    }
  ],
  df: [
    {
      question: "What is a double fault in tennis?",
      answer: "A double fault occurs when a player fails to make both their first and second serve in, resulting in the loss of a point."
    },
    {
      question: "Who has the most double faults in tennis history?",
      answer: "Players with long careers and aggressive serving styles tend to accumulate the most double faults, though this statistic is often correlated with total matches played."
    },
    {
      question: "How do double faults affect match outcomes?",
      answer: "Double faults can significantly impact match momentum and outcomes, especially at crucial points like break points or tie-breaks."
    }
  ],
  "1stserve": [
    {
      question: "What is considered a good first serve percentage?",
      answer: "A first serve percentage above 60% is generally considered good for professional tennis, with top players often maintaining 65-70% or higher."
    },
    {
      question: "Why is first serve percentage important?",
      answer: "A high first serve percentage allows players to dictate points more effectively and avoid relying on their typically weaker second serve."
    },
    {
      question: "How is first serve percentage calculated?",
      answer: "First serve percentage is calculated by dividing the number of first serves in by the total number of first serve attempts, multiplied by 100."
    }
  ],
  "1stservewon": [
    {
      question: "What is a good first serve won percentage?",
      answer: "Top professional players typically win 70-80% of points on their first serve, with the best servers exceeding 80%."
    },
    {
      question: "How does first serve won percentage differ from first serve percentage?",
      answer: "First serve percentage measures how often the first serve goes in, while first serve won percentage measures how often the server wins the point when the first serve is in."
    },
    {
      question: "Which players have the best first serve won percentages?",
      answer: "Big servers like John Isner, Ivo Karlović, and players with powerful serves typically have the highest first serve won percentages in tennis history."
    }
  ],
  "2ndservewon": [
    {
      question: "What is considered a good second serve won percentage?",
      answer: "Winning 50-55% of second serve points is considered good for professional players, with elite players reaching 55-60%."
    },
    {
      question: "Why is the second serve won percentage lower than first serve?",
      answer: "Second serves are typically hit with less pace and more spin to ensure they go in, giving returners more time to set up for their return."
    },
    {
      question: "How can players improve their second serve won percentage?",
      answer: "Players improve this stat through better placement, varying spin and pace, and developing patterns that set up offensive positions."
    }
  ],
  servicewon: [
    {
      question: "What is service points won percentage?",
      answer: "Service points won percentage measures the overall percentage of points won when serving, combining both first and second serve effectiveness."
    },
    {
      question: "What is a good service points won percentage?",
      answer: "Elite players typically win 65-70% of their service points, with dominant servers reaching 70% or higher."
    },
    {
      question: "How does surface affect service points won?",
      answer: "Faster surfaces like grass generally favor servers, leading to higher service points won percentages compared to slower surfaces like clay."
    }
  ],
  bpsaved: [
    {
      question: "What does break points saved percentage mean?",
      answer: "Break points saved percentage measures how often a player successfully defends break point opportunities against them, preventing their opponent from breaking serve."
    },
    {
      question: "What is a good break points saved percentage?",
      answer: "Top players typically save 60-70% of break points they face, with clutch performers exceeding 70%."
    },
    {
      question: "Why is break points saved important?",
      answer: "Saving break points is crucial for maintaining serve and winning matches, especially in tight contests where breaks of serve determine the outcome."
    }
  ],
  bpwon: [
    {
      question: "What is break points won percentage?",
      answer: "Break points won percentage measures how often a player successfully converts break point opportunities to break their opponent's serve."
    },
    {
      question: "What is considered a good break points conversion rate?",
      answer: "Converting 40-45% of break points is typical for top players, with exceptional returners reaching 45-50% or higher."
    },
    {
      question: "Which factors affect break point conversion?",
      answer: "Mental toughness, return quality, court surface, and opponent's serving ability all significantly impact break point conversion rates."
    }
  ],
  "1streturnwon": [
    {
      question: "What is first serve return won percentage?",
      answer: "First serve return won percentage measures how often a player wins points when returning their opponent's first serve."
    },
    {
      question: "What is a good first serve return won percentage?",
      answer: "Winning 30-35% of first serve return points is considered good, with elite returners like Novak Djokovic reaching 35-40%."
    },
    {
      question: "Why is returning first serves difficult?",
      answer: "First serves are typically faster and more powerful, giving returners less time to react and set up for an effective return."
    }
  ],
  "2ndreturnwon": [
    {
      question: "What is second serve return won percentage?",
      answer: "Second serve return won percentage measures how often a player wins points when returning their opponent's second serve."
    },
    {
      question: "What is considered a good second serve return won percentage?",
      answer: "Top players typically win 50-55% of second serve return points, with aggressive returners exceeding 55%."
    },
    {
      question: "Why is second serve return percentage higher?",
      answer: "Second serves are generally slower with more spin, allowing returners more time to set up and attack the return."
    }
  ],
  returnwon: [
    {
      question: "What is return points won percentage?",
      answer: "Return points won percentage measures the overall percentage of points won when returning serve, combining both first and second serve returns."
    },
    {
      question: "What is a good return points won percentage?",
      answer: "Elite players typically win 40-45% of return points, with exceptional returners like Novak Djokovic and Andre Agassi reaching 45% or higher."
    },
    {
      question: "Who are the best returners in tennis history?",
      answer: "Players like Novak Djokovic, Andre Agassi, and Andy Murray are renowned for their exceptional return games and high return points won percentages."
    }
  ],
  totalpoints: [
    {
      question: "Who has played the most points in tennis history?",
      answer: "Players with the longest careers and most matches typically accumulate the highest total point counts, often exceeding 100,000 points in their careers."
    },
    {
      question: "How many points are played in an average tennis match?",
      answer: "An average best-of-three-set match features approximately 150-200 points, while best-of-five-set matches can exceed 300 points."
    },
    {
      question: "Does total points played indicate player longevity?",
      answer: "Yes, total points played is a strong indicator of career longevity and durability, as it reflects the total number of matches and sets played."
    }
  ],
  totalpointswon: [
    {
      question: "Who has won the most points in tennis history?",
      answer: "Players with the longest and most successful careers accumulate the highest total points won, with legends of the sport typically exceeding 60,000-70,000 points won."
    },
    {
      question: "How does total points won relate to match wins?",
      answer: "While winning more points generally leads to winning more matches, tennis scoring means a player can win more total points but still lose a match."
    },
    {
      question: "What is the relationship between points won and career success?",
      answer: "Total points won reflects both longevity and effectiveness, combining career length with win percentage to indicate overall career achievement."
    }
  ],
  totalpointswonpct: [
    {
      question: "What is a good points won percentage?",
      answer: "Elite players typically win 53-55% of total points played, with the very best reaching 55-56% or higher over their careers."
    },
    {
      question: "Why is winning 55% of points considered dominant?",
      answer: "Due to tennis scoring, winning just 55% of points often translates to winning 60-70% of matches, making small percentage differences highly significant."
    },
    {
      question: "Who has the highest career points won percentage?",
      answer: "Players like Björn Borg, Rafael Nadal, and Novak Djokovic are among those with the highest career points won percentages in the Open Era."
    }
  ],
  totalgames: [
    {
      question: "Who has played the most games in tennis history?",
      answer: "Players with the longest careers accumulate the highest game counts, often exceeding 30,000-40,000 games throughout their professional careers."
    },
    {
      question: "How many games are in a typical tennis match?",
      answer: "A typical best-of-three-set match features 20-30 games, while best-of-five-set matches can exceed 50 games."
    },
    {
      question: "Does total games played reflect career success?",
      answer: "Total games played reflects career longevity and participation, but must be combined with games won percentage to assess overall success."
    }
  ],
  totalgameswon: [
    {
      question: "Who has won the most games in tennis history?",
      answer: "Players with the longest and most successful careers accumulate the highest total games won, typically ranging from 20,000-30,000 games for career leaders."
    },
    {
      question: "How does games won relate to match wins?",
      answer: "Games won is highly correlated with match wins, as winning more games directly leads to winning more sets and matches."
    },
    {
      question: "What percentage of games do top players win?",
      answer: "Elite players typically win 55-60% of games played over their careers, with the very best reaching 60% or higher."
    }
  ],
  gameswonpct: [
    {
      question: "What is considered a good games won percentage?",
      answer: "Top professional players typically win 55-60% of games, with dominant players like Nadal and Djokovic exceeding 60%."
    },
    {
      question: "How does games won percentage relate to overall success?",
      answer: "Games won percentage is a strong indicator of overall success, as it directly influences set and match outcomes."
    },
    {
      question: "Which surface affects games won percentage most?",
      answer: "Players often have higher games won percentages on their preferred surface, such as Nadal on clay or Federer on grass."
    }
  ],
  tiebreaksplayed: [
    {
      question: "Who has played the most tiebreaks?",
      answer: "Players with long careers and strong serving games, like Roger Federer and Ivo Karlović, have played thousands of tiebreaks throughout their careers."
    },
    {
      question: "How common are tiebreaks in professional tennis?",
      answer: "Tiebreaks occur in approximately 20-30% of sets at the professional level, depending on surface and playing styles."
    },
    {
      question: "Why do some players play more tiebreaks?",
      answer: "Strong servers who hold serve frequently but struggle to break opponents tend to play more tiebreaks than aggressive baseline players."
    }
  ],
  tiebreakswon: [
    {
      question: "Who has won the most tiebreaks in tennis history?",
      answer: "Players with long careers and strong clutch performance, like Roger Federer, have won well over 1,000 tiebreaks in their careers."
    },
    {
      question: "What factors determine tiebreak success?",
      answer: "Serving ability, mental toughness, point-by-point focus, and experience in pressure situations all contribute to tiebreak success."
    },
    {
      question: "How important are tiebreaks in matches?",
      answer: "Tiebreaks often determine set and match outcomes, making them crucial moments where mental strength and serving ability are tested."
    }
  ],
  tiebreakswonpct: [
    {
      question: "What is a good tiebreak won percentage?",
      answer: "Top players typically win 55-60% of their tiebreaks, with clutch performers and strong servers exceeding 60%."
    },
    {
      question: "Who has the best tiebreak winning percentage?",
      answer: "Players known for mental toughness like Novak Djokovic and Roger Federer maintain some of the highest career tiebreak winning percentages."
    },
    {
      question: "What separates good from great in tiebreaks?",
      answer: "Mental composure, serving under pressure, and the ability to execute winning shots at crucial moments separate good from great tiebreak performers."
    }
  ],
  setsplayed: [
    {
      question: "Who has played the most sets in tennis history?",
      answer: "Players with the longest careers accumulate the highest set counts, with some legends playing over 10,000 sets professionally."
    },
    {
      question: "How many sets are in different tournament formats?",
      answer: "Most men's tournaments use best-of-three sets, while Grand Slams use best-of-five sets for men's singles matches."
    },
    {
      question: "Does total sets played indicate career longevity?",
      answer: "Yes, total sets played strongly indicates career length and durability, reflecting consistent participation at the professional level."
    }
  ],
  setswon: [
    {
      question: "Who has won the most sets in tennis history?",
      answer: "Players with the longest and most successful careers accumulate the highest total sets won, often exceeding 6,000-7,000 sets."
    },
    {
      question: "How does sets won relate to match success?",
      answer: "Sets won is directly correlated with match wins, as winning the majority of sets in a match determines the match outcome."
    },
    {
      question: "What percentage of sets do top players win?",
      answer: "Elite players typically win 60-70% of sets played, with the most dominant players exceeding 70%."
    }
  ],
  setswonpct: [
    {
      question: "What is considered an excellent sets won percentage?",
      answer: "Winning 65-70% of sets is considered excellent for professional players, with dominant players exceeding 70%."
    },
    {
      question: "Who has the highest career sets won percentage?",
      answer: "Players like Rafael Nadal, Novak Djokovic, and Björn Borg are among those with the highest career sets won percentages in tennis history."
    },
    {
      question: "How does sets won percentage compare to match win percentage?",
      answer: "Sets won percentage is typically 5-10% lower than match win percentage due to the nature of best-of-three and best-of-five formats."
    }
  ],
  totalminutes: [
    {
      question: "Who has played the most minutes in tennis history?",
      answer: "Players with the longest careers and tendency to play long matches accumulate the highest total minutes, often exceeding 50,000 minutes (over 800 hours)."
    },
    {
      question: "What is the longest match in tennis history?",
      answer: "The longest match in tennis history was between John Isner and Nicolas Mahut at Wimbledon 2010, lasting 11 hours and 5 minutes over three days."
    },
    {
      question: "How do playing styles affect total minutes?",
      answer: "Defensive baseline players and those who play many five-set matches tend to accumulate more total minutes than aggressive players with shorter points."
    }
  ],
  avgminutes: [
    {
      question: "What is the average length of a professional tennis match?",
      answer: "Best-of-three-set matches typically last 90-120 minutes, while best-of-five-set matches average 3-4 hours."
    },
    {
      question: "Which players have the highest average match duration?",
      answer: "Defensive baseline players like Rafael Nadal and Novak Djokovic, who engage in long rallies, tend to have higher average match durations."
    },
    {
      question: "How does surface affect match duration?",
      answer: "Clay court matches typically last longer due to longer rallies, while grass court matches are often shorter due to faster points and more aces."
    }
  ]
};

const STAT_DESCRIPTIONS: Record<string, string> = {
  aces: "Discover the all-time leaders in aces in men's professional tennis. View career ace totals, rankings, and performance statistics across different surfaces, tournaments, and seasons.",
  df: "Explore the double fault statistics in men's professional tennis. Compare career double fault totals and analyze serving performance across ATP Tour matches.",
  "1stserve": "View the best first serve percentages in men's tennis history. Discover which players maintain the highest consistency on their first serve across different surfaces and tournaments.",
  "1stservewon": "Explore first serve won percentage leaders in professional tennis. See which players dominate when their first serve lands in, with statistics across all ATP matches.",
  "2ndservewon": "Discover the best second serve won percentages in men's tennis. Analyze which players excel at winning points on their second serve across different conditions.",
  servicewon: "View overall service points won percentage leaders in ATP tennis. Compare the most dominant servers by total service effectiveness across their careers.",
  bpsaved: "Explore break points saved percentage statistics. Discover which players are most clutch at defending their serve in critical moments throughout ATP history.",
  bpwon: "View break points won percentage leaders in men's tennis. Analyze which players are most effective at converting break opportunities across different surfaces and tournaments.",
  "1streturnwon": "Discover first serve return won percentage leaders. See which players excel at winning points when returning their opponent's first serve in ATP matches.",
  "2ndreturnwon": "Explore second serve return won percentage statistics. View the best returners who dominate on opponents' second serves across ATP Tour history.",
  returnwon: "View overall return points won percentage leaders. Compare the most effective returners in men's professional tennis across all surfaces and tournaments.",
  totalpoints: "Discover who has played the most points in tennis history. Explore career point totals and longevity statistics from ATP Tour matches spanning decades.",
  totalpointswon: "View career points won leaders in men's professional tennis. See total points won by the greatest players across their ATP Tour careers.",
  totalpointswonpct: "Explore points won percentage leaders in tennis history. Discover which players have been most effective at winning points throughout their careers.",
  totalgames: "View total games played statistics in men's tennis. Explore career longevity through total games played across ATP Tour matches and tournaments.",
  totalgameswon: "Discover career games won leaders in professional tennis. Compare total games won by the greatest players throughout ATP Tour history.",
  gameswonpct: "Explore games won percentage leaders in men's tennis. View the most dominant players by their percentage of games won across all ATP matches.",
  tiebreaksplayed: "View total tiebreaks played statistics. Discover which players have competed in the most tiebreaks throughout their ATP Tour careers.",
  tiebreakswon: "Explore career tiebreaks won leaders in professional tennis. See which players have won the most tiebreaks across ATP Tour history.",
  tiebreakswonpct: "Discover tiebreak won percentage leaders. View the most clutch performers in tiebreaks with the highest winning percentages in men's tennis.",
  setsplayed: "View total sets played statistics in ATP tennis. Explore career longevity through sets played across professional tournaments and matches.",
  setswon: "Explore career sets won leaders in men's professional tennis. Compare total sets won by the greatest players throughout ATP Tour history.",
  setswonpct: "Discover sets won percentage leaders in tennis. View the most dominant players by their percentage of sets won across ATP Tour matches.",
  totalminutes: "View total minutes played statistics in professional tennis. Explore career duration and longevity through total match time across ATP Tour history.",
  avgminutes: "Explore average match duration statistics. Discover which players and playing styles result in the longest average match times in men's tennis."
};

const STAT_KEYWORDS: Record<string, string> = {
  aces: "tennis aces, most aces tennis, career aces, ATP aces leaders, tennis serve statistics, aces record",
  df: "tennis double faults, double fault statistics, ATP double faults, serve errors tennis",
  "1stserve": "first serve percentage, tennis serve statistics, ATP first serve, serve percentage tennis",
  "1stservewon": "first serve won percentage, tennis serving stats, ATP serve winning percentage",
  "2ndservewon": "second serve won percentage, tennis second serve, ATP serve statistics",
  servicewon: "service points won, tennis serve statistics, ATP serving percentage, serve dominance",
  bpsaved: "break points saved, clutch tennis stats, ATP break points, pressure points tennis",
  bpwon: "break points won, break point conversion, tennis return statistics, ATP break points",
  "1streturnwon": "first serve return, tennis return statistics, ATP return percentage",
  "2ndreturnwon": "second serve return, tennis return game, ATP return statistics",
  returnwon: "return points won, tennis return statistics, ATP return percentage, best returners",
  totalpoints: "tennis points played, career points, ATP longevity statistics",
  totalpointswon: "tennis points won, career points won, ATP career statistics",
  totalpointswonpct: "points won percentage, tennis winning percentage, ATP effectiveness",
  totalgames: "tennis games played, career games, ATP longevity statistics",
  totalgameswon: "tennis games won, career games won, ATP statistics",
  gameswonpct: "games won percentage, tennis winning statistics, ATP game percentage",
  tiebreaksplayed: "tennis tiebreaks, tiebreak statistics, ATP tiebreak records",
  tiebreakswon: "tiebreaks won, tennis tiebreak records, ATP tiebreak statistics",
  tiebreakswonpct: "tiebreak won percentage, clutch tennis performance, ATP tiebreak leaders",
  setsplayed: "tennis sets played, career sets, ATP longevity statistics",
  setswon: "tennis sets won, career sets won, ATP winning statistics",
  setswonpct: "sets won percentage, tennis set statistics, ATP dominance",
  totalminutes: "tennis match duration, career minutes played, ATP longevity records",
  avgminutes: "average match duration, tennis match length, ATP match statistics"
};

const RELATED_STATS: Record<string, string[]> = {
  aces: ["df", "1stserve", "1stservewon", "servicewon"],
  df: ["aces", "1stserve", "1stservewon", "servicewon"],
  "1stserve": ["aces", "1stservewon", "servicewon", "2ndservewon"],
  "1stservewon": ["1stserve", "aces", "servicewon", "bpsaved"],
  "2ndservewon": ["1stservewon", "servicewon", "bpsaved"],
  servicewon: ["1stservewon", "2ndservewon", "aces", "bpsaved"],
  bpsaved: ["servicewon", "1stservewon", "bpwon"],
  bpwon: ["bpsaved", "returnwon", "1streturnwon", "2ndreturnwon"],
  "1streturnwon": ["2ndreturnwon", "returnwon", "bpwon"],
  "2ndreturnwon": ["1streturnwon", "returnwon", "bpwon"],
  returnwon: ["1streturnwon", "2ndreturnwon", "bpwon", "totalpointswonpct"],
  totalpoints: ["totalpointswon", "totalpointswonpct", "totalgames", "totalminutes"],
  totalpointswon: ["totalpoints", "totalpointswonpct", "totalgameswon"],
  totalpointswonpct: ["totalpointswon", "gameswonpct", "setswonpct"],
  totalgames: ["totalgameswon", "gameswonpct", "totalpoints"],
  totalgameswon: ["totalgames", "gameswonpct", "setswon"],
  gameswonpct: ["totalgameswon", "totalpointswonpct", "setswonpct"],
  tiebreaksplayed: ["tiebreakswon", "tiebreakswonpct", "setsplayed"],
  tiebreakswon: ["tiebreaksplayed", "tiebreakswonpct", "setswon"],
  tiebreakswonpct: ["tiebreakswon", "tiebreaksplayed", "gameswonpct"],
  setsplayed: ["setswon", "setswonpct", "totalgames", "tiebreaksplayed"],
  setswon: ["setsplayed", "setswonpct", "totalgameswon"],
  setswonpct: ["setswon", "gameswonpct", "totalpointswonpct"],
  totalminutes: ["avgminutes", "totalpoints", "totalgames"],
  avgminutes: ["totalminutes", "totalpoints", "setsplayed"]
};

export async function generateMetadata(
  { params }: { params: Promise<{ stat?: string }> }
) {
  const { stat } = await params;

  const base = "https://stats.tennismylife.org";
  const safeStat = typeof stat === "string" ? stat.trim() : "";
  // Treat explicit 'statistics' token as index to avoid /statistics/statistics canonical
  const isIndex = !safeStat || safeStat.toLowerCase() === 'statistics';

  const path = isIndex ? "/statistics" : `/statistics/${encodeURIComponent(safeStat)}`;
  const title = isIndex
    ? "Statistics | Tennis Statistics"
    : `${STAT_LABELS[safeStat] || safeStat.charAt(0).toUpperCase() + safeStat.slice(1)} | Tennis Statistics`;
  
  const description = isIndex
    ? "Player and match statistics across seasons and tournaments."
    : STAT_DESCRIPTIONS[safeStat] || "Player and match statistics across seasons and tournaments.";

  const keywords = isIndex
    ? "tennis statistics, ATP statistics, tennis player stats, tennis records, tennis rankings"
    : STAT_KEYWORDS[safeStat] || "tennis statistics, ATP statistics, tennis player stats";

  const currentDate = new Date().toISOString();

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `${base}${path}` },
    other: {
      'last-modified': currentDate,
    },
    openGraph: {
      title,
      description,
      url: `${base}${path}`,
      type: "website",
      images: [{ url: `${base}/og/site-preview.png`, width: 1200, height: 630, alt: title }],
      modifiedTime: currentDate,
    },
    twitter: { card: "summary_large_image", site: "@TennisMyLife68", creator: "@TennisMyLife68" }
  };
}

import { redirect } from 'next/navigation';

interface PlayerStat {
  id: string;
  name: string;
  ioc?: string;
  matches: number;
  output: number;
}

// Funzione per recuperare i primi 100 elementi server-side (200 per le stats percentuali)
async function fetchInitialStats(
  stat: string,
  searchParams?: { [key: string]: string | string[] | undefined }
): Promise<PlayerStat[]> {
  try {
    const surface = searchParams?.surface ?? 'all';
    const year = searchParams?.year ?? 'all';
    const tourneyLevel = searchParams?.tourneyLevel ?? 'all';
    
    const percentStats = [
      "1stserve","1stservewon","2ndservewon","servicewon","bpsaved",
      "1streturnwon","2ndreturnwon","returnwon","bpwon",
      "totalpointswonpct","gameswonpct","tiebreakswonpct","setswonpct"
    ];
    const topValue = percentStats.includes(stat) ? '200' : '100';

    const params = new URLSearchParams({
      surface: String(surface),
      year: String(year),
      tourneyLevel: String(tourneyLevel),
      top: topValue,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(
      `${baseUrl}/api/statistics/${stat}?${params.toString()}`,
      { next: { revalidate: 3600 } } // Cache per 1 ora
    );

    if (!res.ok) {
      console.error(`Failed to fetch initial stats: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching initial stats:', error);
    return [];
  }
}

export default async function StatPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ stat?: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { stat } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  // Redirect /statistics/statistics -> /statistics (avoid duplicate index path)
  if (typeof stat === 'string' && stat.toLowerCase() === 'statistics') {
    redirect('/statistics');
  }

  // Trim stat param into a safe string to pass down
  const safe = typeof stat === 'string' ? stat.trim() : '';
  const statKey = safe || 'aces';

  // Recupera i dati server-side per SSR (top 100, o 200 per le percentuali)
  const initialData = await fetchInitialStats(statKey, resolvedSearchParams);
  
  // Genera il page title
  const pageTitle = STAT_LABELS[statKey] || statKey.charAt(0).toUpperCase() + statKey.slice(1);

  // Prepara le statistiche correlate
  const relatedStatsKeys = RELATED_STATS[statKey] || [];
  const relatedStats = relatedStatsKeys.map(key => ({
    key,
    label: STAT_LABELS[key] || key
  }));

  // Genera JSON-LD strutturato per ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${STAT_LABELS[statKey] || statKey} in Men's Tennis`,
    "about": {
      "@type": "SportsOrganization",
      "name": "ATP Tour"
    },
    "itemListOrder": "Descending",
    "itemListElement": initialData.map((player, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Person",
        "name": player.name,
        "sport": "Tennis",
        "additionalProperty": {
          "@type": "PropertyValue",
          "name": STAT_PROPERTY_NAMES[statKey] || statKey,
          "value": player.output,
          "unitText": STAT_UNIT_TEXTS[statKey] || ""
        }
      }
    }))
  };

  // Genera JSON-LD per FAQPage
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": (STAT_FAQS[statKey] || []).map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  // Genera JSON-LD per BreadcrumbList
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://stats.tennismylife.org"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Statistics",
        "item": "https://stats.tennismylife.org/statistics"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": STAT_LABELS[statKey] || statKey,
        "item": `https://stats.tennismylife.org/statistics/${statKey}`
      }
    ]
  };

  // Genera JSON-LD per WebPage con speakable
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${STAT_LABELS[statKey] || statKey} in Men's Tennis`,
    "description": STAT_DESCRIPTIONS[statKey] || "Player and match statistics across seasons and tournaments.",
    "url": `https://stats.tennismylife.org/statistics/${statKey}`,
    "inLanguage": "en",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Tennis My Life Stats",
      "url": "https://stats.tennismylife.org"
    },
    "about": {
      "@type": "SportsOrganization",
      "name": "ATP Tour"
    },
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["h1", ".stat-leader-name", ".stat-value"]
    },
    "dateModified": new Date().toISOString()
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <Suspense fallback={<div className="text-white p-4">Loading...</div>}>
        <StatisticsInner 
          initialData={initialData} 
          initialStat={statKey} 
          pageTitle={pageTitle}
          relatedStats={relatedStats}
        />
      </Suspense>
    </>
  );
}

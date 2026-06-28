export type ReportPlayer = {
  mlbPlayerId: number;
  fullName: string;
  ops?: number | null;
  battingAverage?: number | null;
  homeRuns?: number | null;
  avgExitVelocity?: number | null;
  strikeouts?: number | null;
  hitsAllowed?: number | null;
  homeRunsAllowed?: number | null;
  avgPitchSpeed?: number | null;
  avgSpinRate?: number | null;
};

export type ReportTeam = {
  side: "Team A" | "Team B";
  name: string;
  abbreviation: string;
  season: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    winningPercentage: number | null;
    runsScored: number | null;
    runsAllowed: number | null;
    runDifferential: number | null;
  } | null;
  rolling: {
    wins: number;
    losses: number;
    winningPercentage: number | null;
    runsScoredPerGame: number | null;
    runsAllowedPerGame: number | null;
    runDifferentialPerGame: number | null;
  } | null;
  offense: {
    battingAverage: number | null;
    ops: number | null;
    homeRuns: number | null;
    avgExitVelocity: number | null;
  } | null;
  pitching: {
    strikeouts: number | null;
    avgPitchSpeed: number | null;
    avgSpinRate: number | null;
    era: number | null;
    whip: number | null;
  } | null;
  seasonOffenseLeaders: ReportPlayer[];
  seasonPitchingLeaders: ReportPlayer[];
  hotOffense: ReportPlayer[];
  coldOffense: ReportPlayer[];
  hotPitching: ReportPlayer[];
  coldPitching: ReportPlayer[];
};

export type ScoutingReportData = {
  matchup: string;
  gameDate: string | null;
  latestRefreshAt: string | null;
  teamA: ReportTeam;
  teamB: ReportTeam;
};

export type ReportBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export type ReportSection = {
  heading: string;
  blocks: ReportBlock[];
};

export type GeneratedScoutingReport = {
  title: string;
  staleWarning: string | null;
  sections: ReportSection[];
  markdown: string;
  html: string;
  plainText: string;
};

type Advantage = "Team A" | "Team B" | "Even / No Clear Edge";

const STALE_WARNING =
  "⚠ Data may be stale. Last successful refresh occurred more than 24 hours ago.";

function formatNumber(value: number | null | undefined, digits = 2) {
  return value === null || value === undefined
    ? "Not available"
    : value.toFixed(digits);
}

function formatInteger(value: number | null | undefined) {
  return value === null || value === undefined
    ? "Not available"
    : Math.round(value).toString();
}

function formatDifferential(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  const formatted = value.toFixed(digits);
  return value > 0 ? `+${formatted}` : formatted;
}

function formatTimestamp(value: Date | string | null) {
  if (!value) {
    return "Not available";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatGameDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date);
}

function metricVote(
  teamAValue: number | null | undefined,
  teamBValue: number | null | undefined,
  higherIsBetter = true
) {
  if (
    teamAValue === null ||
    teamAValue === undefined ||
    teamBValue === null ||
    teamBValue === undefined ||
    teamAValue === teamBValue
  ) {
    return 0;
  }

  const teamAIsBetter = higherIsBetter
    ? teamAValue > teamBValue
    : teamAValue < teamBValue;
  return teamAIsBetter ? 1 : -1;
}

function advantageFromVotes(votes: number[]): Advantage {
  const score = votes.reduce((total, vote) => total + vote, 0);
  if (score > 0) {
    return "Team A";
  }
  if (score < 0) {
    return "Team B";
  }
  return "Even / No Clear Edge";
}

function average(values: Array<number | null | undefined>) {
  const available = values.filter((value): value is number => typeof value === "number");
  return available.length
    ? available.reduce((total, value) => total + value, 0) / available.length
    : null;
}

function sum(values: Array<number | null | undefined>) {
  const available = values.filter((value): value is number => typeof value === "number");
  return available.length
    ? available.reduce((total, value) => total + value, 0)
    : null;
}

function comparisonNote(
  teamA: ReportTeam,
  teamB: ReportTeam,
  teamAValue: number | null | undefined,
  teamBValue: number | null | undefined,
  label: string,
  higherIsBetter = true
) {
  const vote = metricVote(teamAValue, teamBValue, higherIsBetter);
  if (!vote) {
    return null;
  }

  const winner = vote > 0 ? teamA : teamB;
  return `${winner.side} (${winner.abbreviation}) has the stronger ${label}.`;
}

function playerRows(
  team: ReportTeam,
  players: ReportPlayer[],
  kind: "offense" | "pitching"
) {
  if (!players.length) {
    return [[team.side, team.abbreviation, "No qualified players", "Not available"]];
  }

  return players.map((player) => [
    team.side,
    team.abbreviation,
    player.fullName,
    kind === "offense"
      ? `OPS ${formatNumber(player.ops, 3)}, AVG ${formatNumber(player.battingAverage, 3)}, HR ${formatInteger(player.homeRuns)}, EV ${formatNumber(player.avgExitVelocity)} mph`
      : `K ${formatInteger(player.strikeouts)}, H ${formatInteger(player.hitsAllowed)}, HR ${formatInteger(player.homeRunsAllowed)}, Velo ${formatNumber(player.avgPitchSpeed)} mph, Spin ${formatNumber(player.avgSpinRate, 0)} rpm`,
  ]);
}

function escapeMarkdown(value: string) {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sectionsToMarkdown(
  title: string,
  warning: string | null,
  sections: ReportSection[]
) {
  const lines = [`# ${title}`, ""];
  if (warning) {
    lines.push(`> ${warning}`, "");
  }

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      lines.push("---", "");
    }
    lines.push(`## ${section.heading}`, "");
    section.blocks.forEach((block) => {
      if (block.type === "paragraph") {
        lines.push(block.text, "");
      } else if (block.type === "list") {
        lines.push(...block.items.map((item) => `- ${item}`), "");
      } else {
        lines.push(
          `| ${block.headers.map(escapeMarkdown).join(" | ")} |`,
          `| ${block.headers.map(() => "---").join(" | ")} |`,
          ...block.rows.map(
            (row) => `| ${row.map(escapeMarkdown).join(" | ")} |`
          ),
          ""
        );
      }
    });
  });

  return lines.join("\n").trim();
}

function sectionsToHtml(
  title: string,
  warning: string | null,
  sections: ReportSection[]
) {
  const content = sections
    .map((section) => {
      const blocks = section.blocks
        .map((block) => {
          if (block.type === "paragraph") {
            return `<p>${escapeHtml(block.text)}</p>`;
          }
          if (block.type === "list") {
            return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
          }
          return `<table><thead><tr>${block.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        })
        .join("");
      return `<section><h2>${escapeHtml(section.heading)}</h2>${blocks}</section>`;
    })
    .join("");

  return `<article><h1>${escapeHtml(title)}</h1>${warning ? `<aside><strong>${escapeHtml(warning)}</strong></aside>` : ""}${content}</article>`;
}

function sectionsToPlainText(
  title: string,
  warning: string | null,
  sections: ReportSection[]
) {
  const lines = [title.toUpperCase(), "=".repeat(title.length), ""];
  if (warning) {
    lines.push(warning, "");
  }

  sections.forEach((section) => {
    lines.push(section.heading.toUpperCase(), "-".repeat(section.heading.length));
    section.blocks.forEach((block) => {
      if (block.type === "paragraph") {
        lines.push(block.text);
      } else if (block.type === "list") {
        lines.push(...block.items.map((item) => `* ${item}`));
      } else {
        lines.push(block.headers.join(" | "));
        lines.push(...block.rows.map((row) => row.join(" | ")));
      }
      lines.push("");
    });
  });

  return lines.join("\n").trim();
}

export function buildScoutingReport(
  data: ScoutingReportData,
  generatedAt: Date
): GeneratedScoutingReport {
  const { teamA, teamB } = data;
  const refreshDate = data.latestRefreshAt
    ? new Date(data.latestRefreshAt)
    : null;
  const staleWarning =
    refreshDate &&
    !Number.isNaN(refreshDate.getTime()) &&
    generatedAt.getTime() - refreshDate.getTime() > 24 * 60 * 60 * 1000
      ? STALE_WARNING
      : null;
  const seasonAdvantage = advantageFromVotes([
    metricVote(
      teamA.season?.winningPercentage,
      teamB.season?.winningPercentage
    ),
    metricVote(teamA.season?.runDifferential, teamB.season?.runDifferential),
  ]);
  const momentumAdvantage = advantageFromVotes([
    metricVote(
      teamA.rolling?.winningPercentage,
      teamB.rolling?.winningPercentage
    ),
    metricVote(
      teamA.rolling?.runDifferentialPerGame,
      teamB.rolling?.runDifferentialPerGame
    ),
  ]);
  const offenseAdvantage = advantageFromVotes([
    metricVote(teamA.offense?.ops, teamB.offense?.ops),
    metricVote(teamA.offense?.battingAverage, teamB.offense?.battingAverage),
    metricVote(teamA.offense?.homeRuns, teamB.offense?.homeRuns),
    metricVote(
      teamA.offense?.avgExitVelocity,
      teamB.offense?.avgExitVelocity
    ),
  ]);
  const pitchingAdvantage = advantageFromVotes([
    metricVote(teamA.pitching?.strikeouts, teamB.pitching?.strikeouts),
    metricVote(teamA.pitching?.avgPitchSpeed, teamB.pitching?.avgPitchSpeed),
    metricVote(teamA.pitching?.avgSpinRate, teamB.pitching?.avgSpinRate),
  ]);
  const playerFormAdvantage = advantageFromVotes([
    metricVote(
      average(teamA.hotOffense.map((player) => player.ops)),
      average(teamB.hotOffense.map((player) => player.ops))
    ),
    metricVote(
      sum(teamA.hotPitching.map((player) => player.strikeouts)),
      sum(teamB.hotPitching.map((player) => player.strikeouts))
    ),
  ]);
  const advantages = [
    ["Season Performance", seasonAdvantage],
    ["Recent Momentum", momentumAdvantage],
    ["Offense", offenseAdvantage],
    ["Pitching", pitchingAdvantage],
    ["Player Form", playerFormAdvantage],
  ] as const;
  const overallAdvantage = advantageFromVotes(
    advantages.map(([, advantage]) =>
      advantage === "Team A" ? 1 : advantage === "Team B" ? -1 : 0
    )
  );
  const summary = [
    comparisonNote(
      teamA,
      teamB,
      teamA.season?.winningPercentage,
      teamB.season?.winningPercentage,
      "season winning percentage"
    ),
    comparisonNote(
      teamA,
      teamB,
      teamA.season?.runDifferential,
      teamB.season?.runDifferential,
      "season run differential"
    ),
    comparisonNote(
      teamA,
      teamB,
      teamA.rolling?.winningPercentage,
      teamB.rolling?.winningPercentage,
      "last-14 winning percentage"
    ),
    comparisonNote(
      teamA,
      teamB,
      teamA.offense?.ops,
      teamB.offense?.ops,
      "recent OPS"
    ),
  ].filter((note): note is string => Boolean(note));
  const overallText =
    overallAdvantage === "Even / No Clear Edge"
      ? "The available comparison categories do not produce a clear overall edge."
      : `${overallAdvantage} appears to hold the overall edge across the available comparison categories.`;
  const analystNotes = [
    comparisonNote(
      teamA,
      teamB,
      teamA.season?.runDifferential,
      teamB.season?.runDifferential,
      "season run differential"
    ),
    comparisonNote(
      teamA,
      teamB,
      teamA.rolling?.winningPercentage,
      teamB.rolling?.winningPercentage,
      "last-14 winning percentage"
    ),
    comparisonNote(
      teamA,
      teamB,
      teamA.offense?.ops,
      teamB.offense?.ops,
      "recent OPS"
    ),
    comparisonNote(
      teamA,
      teamB,
      teamA.pitching?.avgPitchSpeed,
      teamB.pitching?.avgPitchSpeed,
      "average pitch speed"
    ),
    comparisonNote(
      teamA,
      teamB,
      teamA.hotOffense.length,
      teamB.hotOffense.length,
      "count of qualified hot offensive players"
    ),
  ].filter((note): note is string => Boolean(note));
  const playersToWatch = [teamA, teamB].flatMap((team) => {
    const offensePlayer = team.hotOffense[0] ?? team.seasonOffenseLeaders[0];
    const pitchingPlayer = team.hotPitching[0] ?? team.seasonPitchingLeaders[0];
    return [
      offensePlayer
        ? `${team.side} (${team.abbreviation}): ${offensePlayer.fullName}, highlighted by an OPS of ${formatNumber(offensePlayer.ops, 3)}.`
        : null,
      pitchingPlayer
        ? `${team.side} (${team.abbreviation}): ${pitchingPlayer.fullName}, highlighted by ${formatInteger(pitchingPlayer.strikeouts)} strikeouts in the available period.`
        : null,
    ].filter((item): item is string => Boolean(item));
  });
  const sections: ReportSection[] = [
    {
      heading: "Matchup",
      blocks: [{ type: "paragraph", text: data.matchup }],
    },
    {
      heading: "Report Metadata",
      blocks: [
        {
          type: "table",
          headers: ["Field", "Value"],
          rows: [
            ["Matchup", data.matchup],
            ["Game Date", formatGameDate(data.gameDate)],
            ["Report Generated Time", formatTimestamp(generatedAt)],
            ["Last Data Refresh", formatTimestamp(data.latestRefreshAt)],
          ],
        },
      ],
    },
    {
      heading: "Executive Summary",
      blocks: [
        {
          type: "paragraph",
          text: [...summary, overallText].join(" "),
        },
      ],
    },
    {
      heading: "Team Overview",
      blocks: [
        {
          type: "table",
          headers: ["Side", "Team", "Abbreviation"],
          rows: [
            [teamA.side, teamA.name, teamA.abbreviation],
            [teamB.side, teamB.name, teamB.abbreviation],
          ],
        },
      ],
    },
    {
      heading: "Season Snapshot",
      blocks: [
        {
          type: "table",
          headers: ["Team", "Record", "Win %", "RS", "RA", "Diff"],
          rows: [teamA, teamB].map((team) => [
            team.abbreviation,
            team.season
              ? `${team.season.wins}-${team.season.losses}`
              : "Not available",
            formatNumber(team.season?.winningPercentage, 3),
            formatInteger(team.season?.runsScored),
            formatInteger(team.season?.runsAllowed),
            formatDifferential(team.season?.runDifferential),
          ]),
        },
      ],
    },
    {
      heading: "Last 14 Days Comparison",
      blocks: [
        {
          type: "table",
          headers: ["Team", "Record", "Win %", "RS/G", "RA/G", "Diff/G"],
          rows: [teamA, teamB].map((team) => [
            team.abbreviation,
            team.rolling
              ? `${team.rolling.wins}-${team.rolling.losses}`
              : "Not available",
            formatNumber(team.rolling?.winningPercentage, 3),
            formatNumber(team.rolling?.runsScoredPerGame),
            formatNumber(team.rolling?.runsAllowedPerGame),
            formatDifferential(team.rolling?.runDifferentialPerGame, 2),
          ]),
        },
      ],
    },
    {
      heading: "Offensive Comparison",
      blocks: [
        {
          type: "table",
          headers: ["Team", "BA", "OPS", "HR", "Avg Exit Velocity"],
          rows: [teamA, teamB].map((team) => [
            team.abbreviation,
            formatNumber(team.offense?.battingAverage, 3),
            formatNumber(team.offense?.ops, 3),
            formatInteger(team.offense?.homeRuns),
            `${formatNumber(team.offense?.avgExitVelocity)} mph`,
          ]),
        },
      ],
    },
    {
      heading: "Pitching Comparison",
      blocks: [
        {
          type: "table",
          headers: ["Team", "K", "Avg Pitch Speed", "Avg Spin Rate", "ERA", "WHIP"],
          rows: [teamA, teamB].map((team) => [
            team.abbreviation,
            formatInteger(team.pitching?.strikeouts),
            `${formatNumber(team.pitching?.avgPitchSpeed)} mph`,
            `${formatNumber(team.pitching?.avgSpinRate, 0)} rpm`,
            team.pitching?.era === null || !team.pitching
              ? "Coming soon"
              : formatNumber(team.pitching.era),
            team.pitching?.whip === null || !team.pitching
              ? "Coming soon"
              : formatNumber(team.pitching.whip, 3),
          ]),
        },
      ],
    },
    {
      heading: "Hot Offensive Players",
      blocks: [
        {
          type: "table",
          headers: ["Side", "Team", "Player", "Latest Week"],
          rows: [
            ...playerRows(teamA, teamA.hotOffense, "offense"),
            ...playerRows(teamB, teamB.hotOffense, "offense"),
          ],
        },
      ],
    },
    {
      heading: "Cold Offensive Players",
      blocks: [
        {
          type: "table",
          headers: ["Side", "Team", "Player", "Latest Week"],
          rows: [
            ...playerRows(teamA, teamA.coldOffense, "offense"),
            ...playerRows(teamB, teamB.coldOffense, "offense"),
          ],
        },
      ],
    },
    {
      heading: "Hot Pitching Players",
      blocks: [
        {
          type: "table",
          headers: ["Side", "Team", "Player", "Latest Week"],
          rows: [
            ...playerRows(teamA, teamA.hotPitching, "pitching"),
            ...playerRows(teamB, teamB.hotPitching, "pitching"),
          ],
        },
      ],
    },
    {
      heading: "Cold Pitching Players",
      blocks: [
        {
          type: "table",
          headers: ["Side", "Team", "Player", "Latest Week"],
          rows: [
            ...playerRows(teamA, teamA.coldPitching, "pitching"),
            ...playerRows(teamB, teamB.coldPitching, "pitching"),
          ],
        },
      ],
    },
    {
      heading: "Players to Watch",
      blocks: [
        {
          type: "list",
          items: playersToWatch.length
            ? playersToWatch
            : ["No qualified players are available for a supported watch-list claim."],
        },
      ],
    },
    {
      heading: "Matchup Advantages",
      blocks: [
        {
          type: "table",
          headers: ["Category", "Advantage"],
          rows: advantages.map(([category, advantage]) => [category, advantage]),
        },
      ],
    },
    {
      heading: "Analyst Notes",
      blocks: [
        {
          type: "list",
          items: analystNotes.length
            ? analystNotes
            : ["Available data does not support a clear comparison yet."],
        },
      ],
    },
    {
      heading: "Report Footer",
      blocks: [
        { type: "paragraph", text: "Generated by AX Scout" },
        { type: "paragraph", text: "https://axscout.com" },
        {
          type: "table",
          headers: ["Field", "Value"],
          rows: [
            ["Data Refreshed", formatTimestamp(data.latestRefreshAt)],
            ["Report Generated", formatTimestamp(generatedAt)],
            ["Version", "AX Scout Beta"],
          ],
        },
      ],
    },
  ];
  const title = `AX Scout Scouting Report: ${data.matchup}`;

  return {
    title,
    staleWarning,
    sections,
    markdown: sectionsToMarkdown(title, staleWarning, sections),
    html: sectionsToHtml(title, staleWarning, sections),
    plainText: sectionsToPlainText(title, staleWarning, sections),
  };
}

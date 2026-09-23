import mongoose from 'mongoose'

const BattingStatsSchema = new mongoose.Schema(
  {
    runs: Number,
    average: Number,
    strikeRate: Number,
    fifties: Number,
    hundreds: Number,
    highestScore: String,
  },
  { _id: false },
)

const BowlingStatsSchema = new mongoose.Schema(
  {
    wickets: Number,
    economy: Number,
    average: Number,
    bestFigures: String,
  },
  { _id: false },
)

const PlayerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, index: true },
    name: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: ['Batter', 'Bowler', 'All-rounder', 'Wicketkeeper'], index: true },
    nationality: { type: String, required: true, enum: ['Indian', 'Overseas'], index: true },
    country: String,
    age: Number,
    basePrice: { type: Number, required: true, index: true },
    team2025: String,
    capped: Boolean,
    battingStyle: String,
    bowlingStyle: String,
    battingOrder: String,
    bowlingType: String,
    tags: [String],
    rating: Number,
    stats: {
      matches: Number,
      batting: BattingStatsSchema,
      bowling: BowlingStatsSchema,
    },
  },
  { timestamps: true, versionKey: false },
)

export const Player = mongoose.model('Player', PlayerSchema)

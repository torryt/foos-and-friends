# Foosball Test Data Generator 🏓

Generate realistic SQL test data for foosball groups with configurable parameters using Faker.js.

## Features

- **Realistic Data**: Uses Faker.js to generate credible names, departments, and avatars
- **ELO Simulation**: Creates matches with realistic ranking progression over time
- **Configurable**: Customize number of players, matches, time span, and group details
- **User-Based**: All data is created by a specified existing user ID
- **Bell Curve Distribution**: Players start with realistic ELO ratings (normal distribution around 1100)
- **Temporal Spread**: Matches are distributed over the specified time period

## Quick Start

```bash
# Install dependencies
npm install

# Generate test data (user-id is required)
npm run generate -- --user-id="a29f3a94-99ff-45c3-8134-1c41ee6bc460"

# View help
npm run help
```

## Usage

### Required Parameters

- `--user-id=<UUID>`: UUID of existing user who will own/create all the generated data

### Optional Parameters

- `--players=<number>`: Number of players to generate (default: 30)
- `--matches=<number>`: Number of matches to generate (default: 100)  
- `--group-name=<string>`: Name of the group (default: "Generated Champions")
- `--group-description=<string>`: Group description (default: auto-generated)
- `--months=<number>`: Time span for matches in months (default: 12)
- `--locale=<string>`: Faker locale for names (default: "en")

### Examples

```bash
# Basic usage
npm run generate -- --user-id="a29f3a94-99ff-45c3-8134-1c41ee6bc460"

# Custom configuration
npm run generate -- --user-id="a29f3a94-99ff-45c3-8134-1c41ee6bc460" --players=50 --matches=200 --group-name="Office Champions"

# Shorter time period
npm run generate -- --user-id="a29f3a94-99ff-45c3-8134-1c41ee6bc460" --months=6 --matches=50

# Different locale for names
npm run generate -- --user-id="a29f3a94-99ff-45c3-8134-1c41ee6bc460" --locale="en_GB"
```

## Output

The script generates a complete SQL file in the `output/` folder with:

1. **Friend Group**: One group owned by the specified user
2. **Group Membership**: Owner membership for the specified user
3. **Players**: N players with realistic names, departments, avatars, and ELO ratings
4. **Matches**: M matches with realistic outcomes and ELO progression
5. **Statistics Summary**: PostgreSQL notices with generation details

### File Naming

Generated files are named: `foosball-test-data-YYYY-MM-DDTHH-MM-SS.sql`

## Data Generation Details

### Players
- **Names**: Generated using Faker.js with realistic first/last name combinations
- **Departments**: Randomly assigned from Engineering, Product, Design, Marketing, Sales, Operations
- **Avatars**: Selected from a curated list of appropriate emojis
- **ELO Ratings**: Normal distribution (mean: 1100, std dev: 150) clamped to 800-1600

### Matches
- **Team Selection**: Random 4-player combinations for each match
- **Scores**: Realistic score distributions favoring closer games (8-10, 9-10) over blowouts
- **ELO Updates**: Proper ELO calculation with K-factor 32, ratings clamped to 800-2400
- **Timing**: Distributed over specified months with realistic times (12:00-17:59)
- **Progression**: Earlier matches affect later ones through ELO changes

### Statistics Tracking
- Player match counts, wins, and losses are automatically calculated
- Pre/post match ratings are stored for each match
- Final player rankings reflect the full match history

## Example Output Statistics

```
📈 Statistics:
   Average ELO: 1098
   ELO Range: 856 - 1387  
   Total match entries: 120
   Matches per player (avg): 4
```

## SQL Compatibility

Generated SQL is compatible with:
- PostgreSQL (Supabase)
- Uses proper UUID casting
- Includes conflict handling (ON CONFLICT DO NOTHING)
- Single transaction for data integrity
# Dapur Senja — Game Memasak

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Rank](https://make.fun/badge/best-cooking-game-20261125-0137/roseszy/dapur-senja/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Reward](https://make.fun/badge/best-cooking-game-20261125-0137/roseszy/dapur-senja/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

**Dapur Senja (Sunset Kitchen)** is an original 2D canvas cooking game, made for the
[make.fun "Make the best cooking game" bounty](https://make.fun/bounty/best-cooking-game-20261125-0137).
No libraries, no network requests, no audio files — vanilla JavaScript and WebAudio sounds
synthesised live.

## How to play

You are the chef of a small kitchen at sunset. Customers order from the board at the top;
each order has a countdown. Serve the dish before its timer runs out.

1. **Take ingredients** from the crates (tomato, lettuce, onion, cheese, bread, patty).
2. **Chop** tomato, lettuce and onion on the chopping board (stand at the board while it works).
3. **Cook** patties on the stove — take them off in time or they burn.
4. **Assemble** the dish on a plate at the plating counter.
5. **Serve** the finished plate at the serving window. Fast service pays a tip; serving
   dishes in a row builds a combo multiplier.

An expired order costs one life and 30 coins. You have 3 lives and a 3-minute shift.
The shift ends when the timer runs out or the last life is lost — then the final score
screen shows your score, coins and dishes served.

### Menu

| Dish | Ingredients | Price |
| --- | --- | --- |
| Burger Senja | bread + cooked patty + chopped tomato + chopped lettuce | 120 coins |
| Salad Segar | chopped lettuce + chopped tomato + chopped onion | 90 coins |
| Roti Keju Panggang | bread + cheese | 60 coins |
| Burger Keju | bread + cooked patty + cheese + chopped tomato | 140 coins |

## Controls

- **WASD / Arrow keys** — walk
- **E / Space** — use the station in front of you
- **Mouse click** — walk to a station and use it on arrival
- **P** — pause · **R** — restart · **Enter** — start

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots are staged from the real game with `?shot=kitchen|chopping|serving|rush&seed=N`
(see `shots.json`).

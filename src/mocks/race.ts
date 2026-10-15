let raceArmed = false;

export const raceSimulation = {
  isArmed: () => raceArmed,
  set: (value: boolean) => {
    raceArmed = value;
  },
};

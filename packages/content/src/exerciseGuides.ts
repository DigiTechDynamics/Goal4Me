/**
 * How-to guide for every exercise in the library, shown in the workout
 * overview and the in-workout "How to do it" sheet. Keyed by exercise slug;
 * a test checks every exercise has exactly one guide.
 *
 * Writing rules: plain words, second person, one action per step, no medical
 * claims. `steps` walk through one rep (or the hold); `mistakes` name what
 * people most often get wrong and how to fix it.
 */
export interface ExerciseGuide {
  /** One rep, start to finish (3 steps). */
  steps: [string, string, string];
  /** When to breathe in and out. */
  breathing: string;
  /** The two most common mistakes, each with its fix. */
  mistakes: [string, string];
  /** Why it's in your plan, in one sentence. */
  benefit: string;
}

export const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {
  // ---- Warm-up and low-impact cardio ---------------------------------------
  "march-in-place": {
    steps: [
      "Stand tall with your feet hip-width apart.",
      "Lift one knee towards hip height while the opposite arm swings forward.",
      "Lower it and switch sides in a steady rhythm.",
    ],
    breathing: "Breathe naturally through your nose; you should be able to talk.",
    mistakes: [
      "Leaning back as the knee lifts. Keep your chest proud and your core lightly braced.",
      "Stiff arms. Let them swing from the shoulder to set the rhythm.",
    ],
    benefit: "Raises your heart rate gently and wakes up your hips before harder work.",
  },
  "arm-circles": {
    steps: [
      "Stand tall and lift your arms straight out to the sides at shoulder height.",
      "Draw small forward circles, then let them grow bigger.",
      "Halfway through, reverse the direction.",
    ],
    breathing: "Keep breathing slowly and evenly; don't hold your breath.",
    mistakes: [
      "Shrugging towards your ears. Keep your shoulders down and relaxed.",
      "Bending the elbows. Reach long through your fingertips.",
    ],
    benefit: "Warms up the shoulder joints so pushing moves feel smoother and safer.",
  },
  "hip-circles": {
    steps: [
      "Stand with feet wider than hips and hands on your hips.",
      "Push your hips forward, then round to the side, back and the other side.",
      "Make slow, wide circles, then switch direction.",
    ],
    breathing: "Breathe slowly; let each circle take about one breath.",
    mistakes: [
      "Moving the shoulders instead of the hips. Keep your upper body still.",
      "Locked knees. Keep them soft so the hips can move freely.",
    ],
    benefit: "Loosens the hips and lower back, which helps squats and lunges.",
  },
  "step-touch": {
    steps: [
      "Stand with soft knees and arms relaxed.",
      "Step one foot out to the side and bring the other foot to meet it.",
      "Step back the other way, adding an arm swing as you go.",
    ],
    breathing: "Breathe in rhythm with your steps.",
    mistakes: [
      "Stomping. Stay light on the balls of your feet.",
      "Tiny steps. Take a full step to get your heart rate up.",
    ],
    benefit: "Low-impact cardio that's kind to your knees and builds coordination.",
  },
  "boxing-punches": {
    steps: [
      "Stand with one foot in front, knees soft and fists up by your chin.",
      "Punch one arm straight forward, turning your fist palm-down.",
      "Pull it back to your chin as the other arm punches.",
    ],
    breathing: "Breathe out sharply with each punch.",
    mistakes: [
      "Locking your elbows at full reach. Keep a slight bend to protect the joint.",
      "Dropping your guard. Bring each fist back to your chin.",
    ],
    benefit: "Fast cardio that works your shoulders and core with no impact on the legs.",
  },
  "jumping-jacks": {
    steps: [
      "Stand with feet together and arms by your sides.",
      "Jump your feet wide as your arms sweep up overhead.",
      "Jump back to the start, arms coming down.",
    ],
    breathing: "Breathe out on every second jump to keep a rhythm.",
    mistakes: [
      "Landing flat-footed. Land on the balls of your feet with soft knees.",
      "Going too fast too soon. A steady pace lasts the whole interval.",
    ],
    benefit: "Gets the whole body moving and your heart rate up quickly.",
  },
  "high-knees": {
    steps: [
      "Stand tall with arms bent at your sides.",
      "Run on the spot, driving one knee up to hip height.",
      "Switch legs quickly, pumping the opposite arm.",
    ],
    breathing: "Breathe quickly but steadily; don't hold it.",
    mistakes: [
      "Leaning back. Stay tall with a slight forward lean.",
      "Knees too low. Aim for hip height, even if you go slower.",
    ],
    benefit: "Builds running power and burns calories fast.",
  },
  "skater-hops": {
    steps: [
      "Stand on one leg with the knee slightly bent.",
      "Leap sideways and land softly on the other foot.",
      "Let the trailing leg sweep behind, then leap back.",
    ],
    breathing: "Breathe out as you land.",
    mistakes: [
      "Landing on a straight leg. Land with a bent knee to absorb the impact.",
      "Knee caving inwards. Keep it in line with your toes.",
    ],
    benefit: "Strengthens your legs and balance in a side-to-side direction.",
  },
  burpee: {
    steps: [
      "Squat down and put your hands flat on the floor.",
      "Jump your feet back to a plank, then jump them back in.",
      "Stand and jump up with your arms overhead.",
    ],
    breathing: "Breathe out as you jump back and again as you jump up.",
    mistakes: [
      "Sagging hips in the plank. Brace your core so your body is straight.",
      "Landing hard. Land softly through bent knees every time.",
    ],
    benefit: "A full-body move that builds strength and fitness at the same time.",
  },
  "squat-thrust": {
    steps: [
      "Squat down and place your hands on the floor.",
      "Step your feet back one at a time into a plank.",
      "Step them back in and stand up tall.",
    ],
    breathing: "Breathe out as you step back, in as you step forward.",
    mistakes: [
      "Rounding your back on the way down. Bend your knees and keep your chest up.",
      "Hips piking up in the plank. Hold a straight line from head to heels.",
    ],
    benefit: "Teaches the burpee pattern with less impact.",
  },

  // ---- Upper body ------------------------------------------------------------
  "wall-push-up": {
    steps: [
      "Stand an arm's length from a wall and put your hands on it at shoulder height.",
      "Bend your elbows and lower your chest towards the wall.",
      "Push back until your arms are straight.",
    ],
    breathing: "Breathe in as you lower, out as you push away.",
    mistakes: [
      "Bending at the hips. Keep a straight line from head to heels.",
      "Elbows flared out wide. Keep them at about 45 degrees from your body.",
    ],
    benefit: "Builds the strength and form for a full push-up.",
  },
  "knee-push-up": {
    steps: [
      "Kneel and place your hands slightly wider than your shoulders.",
      "Lower your chest towards the floor, keeping hips in line with your shoulders.",
      "Press back up until your arms are straight.",
    ],
    breathing: "Breathe in on the way down, out as you press up.",
    mistakes: [
      "Hips sticking up. Squeeze your glutes to keep a straight line from knees to head.",
      "Going only halfway. Lower until your chest is a fist's height from the floor.",
    ],
    benefit: "Strengthens your chest, shoulders and arms on the way to full push-ups.",
  },
  "push-up": {
    steps: [
      "Start in a high plank with hands under your shoulders.",
      "Lower your chest towards the floor, elbows at about 45 degrees.",
      "Push the floor away until your arms are straight.",
    ],
    breathing: "Breathe in as you lower, out as you push up.",
    mistakes: [
      "Hips sagging. Squeeze your glutes and brace your abs.",
      "Head dropping first. Keep your neck in line, looking just ahead of your hands.",
    ],
    benefit: "The classic upper-body builder for your chest, shoulders, arms and core.",
  },
  "diamond-push-up": {
    steps: [
      "From a plank, bring your hands together under your chest, thumbs and fingers touching.",
      "Lower slowly, keeping your elbows close to your sides.",
      "Press back up to straight arms.",
    ],
    breathing: "Breathe in on the way down, out on the way up.",
    mistakes: [
      "Elbows flaring out. Keep them brushing your ribs.",
      "Going deeper than you can control. Stop where you can still push back up smoothly.",
    ],
    benefit: "Puts extra work on your triceps for stronger, more defined arms.",
  },
  "pike-push-up": {
    steps: [
      "From a plank, walk your feet in and lift your hips into an upside-down V.",
      "Bend your elbows and lower the top of your head towards the floor.",
      "Push back up through your shoulders.",
    ],
    breathing: "Breathe in as you lower, out as you press.",
    mistakes: [
      "Hips dropping into a plank. Keep them high so your shoulders do the work.",
      "Elbows flaring wide. Bend them back towards your feet.",
    ],
    benefit: "Builds shoulder strength and prepares you for handstand work.",
  },
  "chair-dip": {
    steps: [
      "Sit on the edge of a sturdy chair, hands gripping the edge beside your hips.",
      "Slide forward and bend your elbows straight back to lower your body.",
      "Press back up until your arms are straight.",
    ],
    breathing: "Breathe in on the way down, out as you push up.",
    mistakes: [
      "Drifting away from the chair. Keep your back close to the seat.",
      "Going too low. Stop when your upper arms are about level with the floor.",
    ],
    benefit: "Strengthens the backs of your arms with nothing but a chair.",
  },
  "wall-angels": {
    steps: [
      "Stand with your back, head and bottom against a wall.",
      "Raise your arms into a goalpost shape, backs of hands on the wall.",
      "Slide your arms up overhead and back down slowly.",
    ],
    breathing: "Breathe in as your arms rise, out as they lower.",
    mistakes: [
      "Arching your lower back off the wall. Brace your abs to keep it flat.",
      "Forcing the range. Only go as high as your hands can stay near the wall.",
    ],
    benefit: "Improves posture and shoulder mobility, great after a day at a desk.",
  },

  // ---- Core ---------------------------------------------------------------------
  "dead-bug": {
    steps: [
      "Lie on your back with arms pointing up and knees bent above your hips.",
      "Slowly lower your right arm and left leg towards the floor.",
      "Return to the start and switch sides.",
    ],
    breathing: "Breathe out as you extend, in as you return.",
    mistakes: [
      "Lower back lifting. Press it into the floor the whole time.",
      "Rushing. Move slowly; control is the point.",
    ],
    benefit: "Trains your core to keep your spine steady, which protects your back.",
  },
  "bird-dog": {
    steps: [
      "Start on all fours, hands under shoulders and knees under hips.",
      "Reach one arm forward and the opposite leg back until both are level.",
      "Pause, return, and switch sides.",
    ],
    breathing: "Breathe out as you reach, in as you return.",
    mistakes: [
      "Hips twisting. Keep them level, as if balancing a cup on your back.",
      "Lifting the leg too high. Stop at hip height so your back doesn't arch.",
    ],
    benefit: "Builds core and lower-back strength with balance and control.",
  },
  "forearm-plank": {
    steps: [
      "Place your forearms on the floor with elbows under your shoulders.",
      "Step your feet back so your body forms one straight line.",
      "Hold, squeezing your glutes and abs.",
    ],
    breathing: "Keep breathing slowly through the hold; don't hold your breath.",
    mistakes: [
      "Hips sagging. Squeeze your glutes and pull your belly button in.",
      "Hips piking up. Lower them until you're straight from head to heels.",
    ],
    benefit: "Builds a strong, stable core that supports every other move.",
  },
  "side-plank": {
    steps: [
      "Lie on your side with your elbow under your shoulder.",
      "Stack your feet, or drop the bottom knee to make it easier.",
      "Lift your hips so your body is straight, and hold.",
    ],
    breathing: "Breathe steadily through the hold.",
    mistakes: [
      "Hips dropping. Push them up towards the ceiling.",
      "Shoulder sinking. Push the floor away with your forearm.",
    ],
    benefit: "Strengthens the sides of your waist and helps protect your lower back.",
  },
  "bicycle-crunch": {
    steps: [
      "Lie on your back, hands lightly behind your head and knees up.",
      "Bring one elbow towards the opposite knee as the other leg extends.",
      "Switch sides in a slow pedalling motion.",
    ],
    breathing: "Breathe out each time you twist.",
    mistakes: [
      "Pulling on your neck. Let your hands just cradle your head.",
      "Going too fast. Slow, full twists work your abs harder.",
    ],
    benefit: "Works your abs and obliques together.",
  },
  "leg-raise": {
    steps: [
      "Lie on your back with legs straight and hands by your sides.",
      "Keeping your lower back down, raise your legs until they point up.",
      "Lower them slowly without letting your back arch.",
    ],
    breathing: "Breathe out as your legs rise, in as they lower.",
    mistakes: [
      "Lower back arching off the floor. Bend your knees or stop higher.",
      "Dropping the legs. The slow lowering is where the work happens.",
    ],
    benefit: "Targets the lower part of your abs.",
  },
  "hollow-hold": {
    steps: [
      "Lie on your back and press your lower back into the floor.",
      "Lift your shoulders, arms and legs off the floor.",
      "Hold a long banana shape.",
    ],
    breathing: "Take short, steady breaths while holding the shape.",
    mistakes: [
      "Lower back lifting. Raise your legs higher or bend your knees.",
      "Neck straining. Tuck your chin slightly and look at your toes.",
    ],
    benefit: "Builds the deep core strength gymnasts rely on.",
  },
  "mountain-climbers": {
    steps: [
      "Start in a high plank with shoulders over your wrists.",
      "Drive one knee towards your chest.",
      "Switch legs quickly, like running in place.",
    ],
    breathing: "Breathe quickly and rhythmically.",
    mistakes: [
      "Hips bouncing up. Keep them low and level.",
      "Shoulders drifting behind the hands. Keep them stacked over your wrists.",
    ],
    benefit: "Cardio and core in one, raising your heart rate fast.",
  },
  "plank-shoulder-taps": {
    steps: [
      "Start in a high plank with feet a little wider than hips.",
      "Lift one hand and tap the opposite shoulder.",
      "Put it down and tap with the other hand.",
    ],
    breathing: "Breathe out with each tap.",
    mistakes: [
      "Hips rocking side to side. Widen your feet and squeeze your glutes.",
      "Rushing the taps. Slow taps make your core work harder.",
    ],
    benefit: "Builds core stability and shoulder strength.",
  },

  // ---- Lower body ---------------------------------------------------------------
  "glute-bridge": {
    steps: [
      "Lie on your back with knees bent and feet flat, hip-width apart.",
      "Press through your heels and lift your hips until your body is straight from knees to shoulders.",
      "Squeeze your glutes at the top, then lower slowly.",
    ],
    breathing: "Breathe out as you lift, in as you lower.",
    mistakes: [
      "Arching your back at the top. Stop when your hips are in line and squeeze.",
      "Pushing through your toes. Drive through your heels to work your glutes.",
    ],
    benefit: "Strengthens your glutes and hamstrings, which supports your back and knees.",
  },
  "wall-glute-bridge": {
    steps: [
      "Lie on your back with your feet flat on a wall, knees at 90 degrees.",
      "Press your feet into the wall and lift your hips.",
      "Pause at the top, then lower slowly.",
    ],
    breathing: "Breathe out as you lift, in as you lower.",
    mistakes: [
      "Feet too low on the wall. Set them so your knees make a right angle.",
      "Arching your back. Lift only until your hips are in line.",
    ],
    benefit: "A gentle way to strengthen the glutes and back of the legs.",
  },
  "single-leg-glute-bridge": {
    steps: [
      "Lie on your back with one foot flat and the other leg lifted straight.",
      "Press through the planted heel to lift your hips.",
      "Lower slowly; switch legs each set.",
    ],
    breathing: "Breathe out as you lift, in as you lower.",
    mistakes: [
      "One hip dropping. Keep both hips level as you lift.",
      "Using your lower back. Squeeze your glute to start every rep.",
    ],
    benefit: "Builds stronger glutes and evens out left-right differences.",
  },
  "side-leg-raise": {
    steps: [
      "Lie on your side with legs straight and hips stacked.",
      "Lift your top leg, leading with your heel.",
      "Lower it slowly without letting it rest.",
    ],
    breathing: "Breathe out as the leg lifts.",
    mistakes: [
      "Rolling your hips back. Keep them stacked, toes pointing forward.",
      "Swinging the leg. Lift and lower with control.",
    ],
    benefit: "Strengthens your outer hips, which keeps your knees stable.",
  },
  "calf-raise": {
    steps: [
      "Stand tall with feet hip-width apart, a hand on a wall for balance.",
      "Rise up onto your toes as high as you can.",
      "Lower your heels slowly to the floor.",
    ],
    breathing: "Breathe out as you rise, in as you lower.",
    mistakes: [
      "Bouncing. Pause at the top and lower slowly.",
      "Rolling onto the outer edges of your feet. Push through your big toes.",
    ],
    benefit: "Strengthens your calves and ankles for walking, running and jumping.",
  },
  squat: {
    steps: [
      "Stand with feet shoulder-width apart, toes slightly out.",
      "Sit your hips back and down, chest up, as if sitting in a chair.",
      "Drive through your whole foot to stand back up.",
    ],
    breathing: "Breathe in as you lower, out as you stand.",
    mistakes: [
      "Knees caving in. Push them out in line with your toes.",
      "Heels lifting. Sit back more and keep your weight in your mid-foot.",
    ],
    benefit: "The foundation of lower-body strength for your thighs and glutes.",
  },
  "wall-sit": {
    steps: [
      "Lean your back against a wall and walk your feet out.",
      "Slide down until your knees are bent, ideally to 90 degrees.",
      "Hold with your back flat on the wall.",
    ],
    breathing: "Breathe slowly through the hold.",
    mistakes: [
      "Knees past your toes. Walk your feet further out.",
      "Hands pushing on your thighs. Keep your arms off your legs.",
    ],
    benefit: "Builds leg endurance without any impact.",
  },
  "reverse-lunge": {
    steps: [
      "Stand tall with feet hip-width apart.",
      "Step one foot back and lower until both knees are bent.",
      "Push through your front heel to return; switch legs.",
    ],
    breathing: "Breathe in as you step back, out as you stand.",
    mistakes: [
      "Front knee drifting past the toes. Keep it over your ankle.",
      "Leaning forward. Keep your chest up and torso upright.",
    ],
    benefit: "Strengthens each leg on its own, kinder on the knees than forward lunges.",
  },
  "split-squat": {
    steps: [
      "Take a long stride, back heel lifted.",
      "Lower straight down until your back knee nearly touches the floor.",
      "Press up through your front heel; switch legs each set.",
    ],
    breathing: "Breathe in on the way down, out on the way up.",
    mistakes: [
      "Stance too short. Lengthen it so your front shin stays upright.",
      "Leaning forward. Keep your torso tall over your hips.",
    ],
    benefit: "Builds single-leg strength and balance for your thighs and glutes.",
  },
  "squat-jump": {
    steps: [
      "Lower into a squat with arms behind you.",
      "Jump up explosively, swinging your arms forward.",
      "Land softly and sink straight into the next squat.",
    ],
    breathing: "Breathe out as you jump.",
    mistakes: [
      "Stiff-legged landings. Land on the balls of your feet with bent knees.",
      "Knees caving on landing. Keep them in line with your toes.",
    ],
    benefit: "Adds power to your legs and burns energy fast.",
  },

  // ---- Stretches and mobility ----------------------------------------------------
  "cat-cow": {
    steps: [
      "Start on all fours with a flat back.",
      "Round your back up towards the ceiling, tucking your chin (cat).",
      "Drop your belly and lift your chest and tailbone (cow).",
    ],
    breathing: "Breathe out into cat, in into cow.",
    mistakes: [
      "Moving only the neck. Let the movement travel through your whole spine.",
      "Rushing. Move slowly with your breath.",
    ],
    benefit: "Keeps your spine mobile and eases back stiffness.",
  },
  "childs-pose": {
    steps: [
      "Kneel and sit back towards your heels.",
      "Walk your hands forward and lower your chest towards the floor.",
      "Rest your forehead down and relax.",
    ],
    breathing: "Take slow, deep breaths into your back.",
    mistakes: [
      "Forcing your hips to your heels. Widen your knees if it's tight.",
      "Holding tension in your shoulders. Let them melt towards the floor.",
    ],
    benefit: "Gently stretches your back and hips and helps you recover.",
  },
  "hamstring-stretch": {
    steps: [
      "Stand with feet hip-width apart and a soft bend in your knees.",
      "Hinge at your hips and reach your hands down your legs.",
      "Hold where you feel a stretch behind your thighs.",
    ],
    breathing: "Breathe slowly; relax a little deeper each time you breathe out.",
    mistakes: [
      "Rounding your back to reach further. Hinge from the hips with a long spine.",
      "Bouncing. Hold the stretch still.",
    ],
    benefit: "Loosens the backs of your legs, which can ease lower-back tightness.",
  },
  "quad-stretch": {
    steps: [
      "Stand tall, holding a wall for balance if needed.",
      "Bend one knee and hold that foot behind you.",
      "Keep your knees together and hold, then switch.",
    ],
    breathing: "Breathe slowly and evenly.",
    mistakes: [
      "Knee drifting forward or out. Keep both knees side by side.",
      "Arching your back. Tuck your tailbone slightly.",
    ],
    benefit: "Stretches the fronts of your thighs after squats and lunges.",
  },
  "cobra-stretch": {
    steps: [
      "Lie face down with hands under your shoulders.",
      "Press gently to lift your chest, keeping your hips down.",
      "Hold, then lower slowly.",
    ],
    breathing: "Breathe in as you lift, breathe slowly while you hold.",
    mistakes: [
      "Pushing too high. Lift only as far as feels comfortable for your back.",
      "Shoulders up by your ears. Draw them down and back.",
    ],
    benefit: "Opens your chest and abs and eases stiffness from sitting.",
  },
  "wall-hamstring-stretch": {
    steps: [
      "Sit side-on to a wall, then swing your legs up as you lie back.",
      "Scoot your hips as close to the wall as is comfortable.",
      "Let your legs rest on the wall and relax.",
    ],
    breathing: "Breathe slowly and let your body get heavier with each breath out.",
    mistakes: [
      "Hips too far from the wall. Move closer for a stronger stretch.",
      "Tense shoulders and neck. Let your arms rest by your sides.",
    ],
    benefit: "A relaxing stretch for the backs of your legs that helps you wind down.",
  },
};

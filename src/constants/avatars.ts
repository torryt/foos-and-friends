export const AVAILABLE_AVATARS = [
  // Humanoid avatars - gender diverse
  '👨‍💻', // Man technologist
  '👩‍💻', // Woman technologist
  '👨‍🎨', // Man artist
  '👩‍🎨', // Woman artist
  '👨‍💼', // Man office worker
  '👩‍💼', // Woman office worker
  '👨‍🔬', // Man scientist
  '👩‍🔬', // Woman scientist
  '👨‍🚀', // Man astronaut
  '👩‍🚀', // Woman astronaut
  '👨‍🎓', // Man student
  '👩‍🎓', // Woman student
  '👨‍⚕️', // Man health worker
  '👩‍⚕️', // Woman health worker
  '👨‍🏫', // Man teacher
  '👩‍🏫', // Woman teacher
  '👨‍⚖️', // Man judge
  '👩‍⚖️', // Woman judge
  '👨‍🌾', // Man farmer
  '👩‍🌾', // Woman farmer
  '👨‍🍳', // Man cook
  '👩‍🍳', // Woman cook
  '👨‍🔧', // Man mechanic
  '👩‍🔧', // Woman mechanic
  '👨‍🏭', // Man factory worker
  '👩‍🏭', // Woman factory worker
  '👨‍✈️', // Man pilot
  '👩‍✈️', // Woman pilot
  '👨‍🎤', // Man singer
  '👩‍🎤', // Woman singer
  '👨‍🚒', // Man firefighter
  '👩‍🚒', // Woman firefighter
  '👮‍♂️', // Man police officer
  '👮‍♀️', // Woman police officer
  '🕵️‍♂️', // Man detective
  '🕵️‍♀️', // Woman detective
  '💂‍♂️', // Man guard
  '💂‍♀️', // Woman guard
  '🥷', // Ninja
  '👤', // Silhouette
  '👥', // Silhouettes
  '🧔', // Bearded person
  '🧔‍♀️', // Woman with beard
  '👨‍🦱', // Man with curly hair
  '👩‍🦱', // Woman with curly hair
  '👨‍🦳', // Man with white hair
  '👩‍🦳', // Woman with white hair
  '👨‍🦲', // Bald man
  '👩‍🦲', // Bald woman
  '🧓', // Older person
  '👴', // Old man
  '👵', // Old woman
  '👶', // Baby
  '🧒', // Child
  '👦', // Boy
  '👧', // Girl
  '🧑‍🦯', // Person with white cane
  '👨‍🦯', // Man with white cane
  '👩‍🦯', // Woman with white cane
  '🧑‍🦽', // Person in motorized wheelchair
  '👨‍🦽', // Man in motorized wheelchair
  '👩‍🦽', // Woman in motorized wheelchair
  '🧑‍🦼', // Person in manual wheelchair
  '👨‍🦼', // Man in manual wheelchair
  '👩‍🦼', // Woman in manual wheelchair
  '🤱', // Breast-feeding
  '🤴', // Prince
  '👸', // Princess
  '🤵', // Person in tuxedo
  '👰', // Person with veil
  '🤰', // Pregnant person
  '🤹‍♂️', // Man juggling
  '🤹‍♀️', // Woman juggling
  '🏃‍♂️', // Man running
  '🏃‍♀️', // Woman running
  '🚶‍♂️', // Man walking
  '🚶‍♀️', // Woman walking
  '🧘‍♂️', // Man in lotus position
  '🧘‍♀️', // Woman in lotus position
  '🛌', // Person in bed

  // Fantasy/Fictional humanoids
  '🦸‍♂️', // Man superhero
  '🦸‍♀️', // Woman superhero
  '🦹‍♂️', // Man supervillain
  '🦹‍♀️', // Woman supervillain
  '🧙‍♂️', // Man mage
  '🧙‍♀️', // Woman mage
  '🧚‍♂️', // Man fairy
  '🧚‍♀️', // Woman fairy
  '🧛‍♂️', // Man vampire
  '🧛‍♀️', // Woman vampire
  '🧞‍♂️', // Man genie
  '🧞‍♀️', // Woman genie
  '🧟‍♂️', // Man zombie
  '🧟‍♀️', // Woman zombie
  '🧝‍♂️', // Man elf
  '🧝‍♀️', // Woman elf
  '🎅', // Santa Claus
  '🤶', // Mrs. Claus
  '🧑‍🎄', // Mx Claus

  // Animals and creatures
  '🐵',
  '🐶',
  '🐺',
  '🦊',
  '🐱',
  '🦁',
  '🐯',
  '🐨',
  '🐼',
  '🐸',
  '🐧',
  '🦄',
  '🤖',
  '👽',
  '👻',
  '🐉',
  '🦖',
  '🦕',
  '🐙',
  '🦑',
  '🐠',
  '🐡',
  '🦈',
  '🐳',
  '🐋',
  '🐬',
  '🦅',
  '🦆',
  '🦉',
  '🦇',
  '🐝',
  '🐞',
  '🦋',
  '🐛',
  '🐢',
  '🐍',
  '🦎',
]

export const getRandomAvatar = (): string => {
  return AVAILABLE_AVATARS[Math.floor(Math.random() * AVAILABLE_AVATARS.length)]
}

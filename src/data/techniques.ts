export interface Technique {
  name: string;
  definition: string;
  example: string;
  selected?: boolean;
}

export const techniques = [
  {
    name: "Backstory",
    definition:
      "Story that precedes events in the story being told—past events or background that add meaning to current circumstances",
    example:
      "Though The Lord of the Rings trilogy takes place in a relatively short period towards the end of the 3021-year Third Age, the narration gives glimpses of the mythological and historical events which took place earlier in the Third age leading up to the action in the novel, and in the First and Second Age.",
  },
  {
    name: "Chekhov's gun",
    definition:
      "A dramatic principle that requires every element in a narrative to be substantive, with anything redundant or arbitrary removed.",
    example:
      "\"Remove everything that has no relevance to the story. If you say in the first chapter that there is a rifle hanging on the wall, in the second or third chapter it absolutely must go off. If it's not going to be fired, it shouldn't be hanging there.\" — Anton Chekhov",
  },
  {
    name: "Cliffhanger",
    definition: "The narrative ends unresolved, to draw the audience back to a future episode for the resolution.",
    example:
      "Almost every episode of TV shows like Dexter and Breaking Bad ends with one of the characters in a predicament (about to be caught by thugs, about to be exposed by the authorities, or a family member or a friend finds out the main character's dirty secret).",
  },
  {
    name: "Eucatastrophe",
    definition:
      "Coined by J. R. R. Tolkien, a climactic event through which the protagonist appears to be facing a catastrophic change. However, this change does not materialize and the protagonist finds themselves as the benefactor of such a climactic event; contrast peripety/peripateia.",
    example:
      "At the end of The Lord of the Rings, Gollum forcibly takes away the Ring from Frodo, suggesting that Sauron would eventually take over Middle Earth. However, Gollum celebrates too eagerly and clumsily falls into the lava, whereby the ring is destroyed and with it Sauron's power. In a way, Gollum does what Frodo and the Fellowship of the Ring intended to do through the whole plot of the trilogy, which was to throw the ring into the lake of fire in the heart of Mount Doom.",
  },
  {
    name: "Flashback",
    definition: "Alteration of time sequences, taking characters back to the beginning of the tale, for instance",
    example:
      'The story of "The Three Apples" in the Arabian Nights tales begins with the discovery of a young woman\'s dead body. After the murderer later reveals himself, he narrates his reasons for the murder as a flashback of events leading up to the discovery of her dead body at the beginning of the story.',
  },
  {
    name: "Flashforward",
    definition:
      "A scene that temporarily jumps the narrative forward in time. A flashforward often represents events expected, projected, or imagined to occur in the future. They may also reveal significant parts of the story that have not yet occurred, but soon will in greater detail.",
    example:
      "Occurs in A Christmas Carol when Mr. Scrooge visits the ghost of the future. It is also frequent in the later seasons of the television series Lost.",
  },
  {
    name: "Foreshadowing",
    definition:
      "Implicit yet intentional efforts of an author to suggest events that have yet to take place in the process of narration. See also repetitive designation and Chekhov's gun",
    example:
      "A narration might begin with a male character who has to break up a schoolyard fight among some boys who are vying for the attention of a girl, which was introduced to foreshadow the events leading to a dinner time squabble between the character and his twin brother over a woman, whom both are courting at the same time.",
  },
  {
    name: "Frame story",
    definition: 'A main story that hatches a framing device, a story that is "framed" in the main story.',
    example:
      "Early examples include Panchatantra, Kalila and Dimna, Arabian Nights, and The Decameron. More modern examples are Brian Jacques's 1999 The Legend of Luke, Ramsay Wood's 2011 Kalila and Dimna update, subtitled Fables of Conflict and Intrigue and Sophia de Mello Breyner Andresen's 1964 The Knight of Denmark (O cavaleiro da Dinamarca).",
  },
  {
    name: "In medias res",
    definition: "Beginning the story in the middle of a sequence of events. A specific form of narrative hook.",
    example:
      "This is used in epic poems, for example, where it is a mandatory form to be adopted. Luís de Camões' The Lusiads or the Iliad and the Odyssey of Homer are prime examples. The latter work begins with the return of Odysseus to his home of Ithaca and then in flashbacks tells of his ten years of wandering following the Trojan War. The Lusiads starts in the middle of the sea voyage to India and contextualizes the beginning of said journey as well as Portugal's history when the master of the ship tells an African king about it.",
  },
  {
    name: "Narrative hook",
    definition: 'Story opening that "hooks" readers\' attention so they will keep reading',
    example: "Any non-fiction book is often introduced with an interesting factoid.",
  },
  {
    name: "MacGuffin",
    definition:
      "Object required to initiate the plot or motivation of the characters, but having little significance by itself",
    example:
      '"Heart of the Ocean" necklace in James Cameron\'s 1997 Titanic, which essentially serves as an object to cause Rose to tell her story.',
  },
  {
    name: "Ochi",
    definition: "A sudden interruption of the wordplay flow indicating the end of a rakugo or a kobanashi.",
    example:
      "A Rakugo is a Japanese verbal entertainment usually lasting 30 minutes which ends with a surprise punch line, a narrative stunt known as ochi (fall) or sage (lowering). Twelve kinds of ochi are codified and recognized. The earlier kobanashi was a short comical vignette ending with an ochi.",
  },
  {
    name: "Plot twist",
    definition: 'Unexpected change ("twist") in the direction or expected outcome of the plot. See also twist ending.',
    example:
      'An early example is the Arabian Nights tale "The Three Apples". A locked chest found by a fisherman contains a dead body, and two different men claim to be the murderer, which turns out to be the investigator\'s own slave.',
  },
  {
    name: "Poetic justice",
    definition:
      "Virtue ultimately rewarded, or vice punished, by an ironic twist of fate related to the character's own conduct",
    example:
      "Wile E. Coyote coming up with a contraption to catch the Road Runner, only to be foiled and caught by his own devices. Each sin's punishment in Dante's Inferno is a symbolic instance of poetic justice.",
  },
  {
    name: "Predestination paradox",
    definition:
      'Time travel paradox where a time traveler is caught in a loop of events that "predestines" them to travel back in time',
    example:
      "In Doctor Who, the main character repeatedly finds himself under the obligation of having to travel back in time because of something his future character has done.",
  },
  {
    name: "Red herring",
    definition: "Diverting attention away from an item of significance.",
    example:
      "For example, in mystery fiction, an innocent party may be purposefully cast as highly suspicious through emphasis or descriptive techniques to divert attention from the true guilty party.",
  },
  {
    name: "Self-fulfilling prophecy",
    definition: "Prediction that, by being made, makes itself come true.",
    example:
      "Early examples include the legend of Oedipus, and the story of Krishna in the Mahabharata. There is also an example of this in Harry Potter when Lord Voldemort heard a prophecy (made by Sybill Trelawney to Dumbledore) that a boy born at the end of July, whose parents had defied Voldemort thrice and survived, would be made marked as his equal. Because of this prophecy, Lord Voldemort sought out Harry Potter (believing him to be the boy spoken of) and tried to kill him. His parents died protecting him, and when Voldemort tried to cast a killing curse on Harry, it rebounded and took away most of his strength, and gave Harry Potter a unique ability and connection with the Dark Lord thus marking him as his equal.",
  },
  {
    name: "Story within a story",
    definition: "A story told within another story. See also frame story.",
    example:
      "In Stephen King's The Wind Through the Keyhole, of the Dark Tower series, the protagonist tells a story from his past to his companions, and in this story he tells another relatively unrelated story.",
  },
  {
    name: "Ticking time bomb scenario",
    definition:
      "Threat of impending disaster—often used in thrillers where salvation and escape are essential elements",
    example:
      "In the post-apocalyptic novel On the Beach, the main characters face increasing radioactivity drifting across the equator toward Australia. Learning that the worst is predicted to come sooner rather than later heightens the urgency and sense of immediacy felt by the characters and by the reader.",
  },
  {
    name: "Unreliable narrator",
    definition:
      "The narrator of the story is not sincere, or introduces a bias in their narration and possibly misleads the reader, hiding or minimizing events, characters, or motivations.",
    example:
      "An example is The Murder of Roger Ackroyd. The novel includes an unexpected plot twist at the end of the novel. In the last chapter, Sheppard describes how he was an unreliable narrator.",
  },
];

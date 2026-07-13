const GAME_CATEGORIES = {
  peliculas: {
    name: "Películas y Series",
    icon: "🎬",
    description: "Cine, series de televisión, personajes de películas y clásicos de la pantalla grande.",
    color: "#ff3366",
    words: [
      "Titanic", "Harry Potter", "Spider-Man", "Los Simpson", "Breaking Bad", 
      "La Casa de Papel", "El Señor de los Anillos", "Star Wars", "Jurassic Park", "El Rey León",
      "Avatar", "Juego de Tronos", "Toy Story", "Shrek", "Gladiator", 
      "Stranger Things", "Matrix", "Inception", "Bob Esponja", "Batman: El Caballero Oscuro",
      "Narcos", "El Padrino", "Squid Game", "Cars", "Iron Man", 
      "Mi Pobre Angelito", "Frozen", "Piratas del Caribe", "Peaky Blinders", "Buscando a Nemo",
      "Forrest Gump", "Los Vengadores", "Wednesday (Merlina)", "Monsters Inc.", "Interestelar",
      "La La Land", "El Show de Truman", "Pulp Fiction", "Grease", "Mad Max",
      "Joker", "Terminator", "El Viaje de Chihiro", "Ratatouille", "El Club de la Pelea",
      "Friends", "The Office", "Jumanji", "Volver al Futuro", "Indiana Jones"
    ]
  },
  videojuegos: {
    name: "Videojuegos",
    icon: "🎮",
    description: "Títulos de consolas y PC clásicos, modernos, personajes y elementos del mundo gaming.",
    color: "#33ccff",
    words: [
      "Super Mario Bros", "Minecraft", "Zelda: Breath of the Wild", "Fortnite", "Tetris", 
      "Grand Theft Auto V", "Pac-Man", "FIFA / EA Sports FC", "League of Legends", "Pokémon Rojo y Azul",
      "Elden Ring", "Among Us", "Clash Royale", "Sonic the Hedgehog", "Counter-Strike", 
      "Cyberpunk 2077", "God of War", "Red Dead Redemption 2", "World of Warcraft", "Geometry Dash",
      "Assassin's Creed", "Animal Crossing", "Roblox", "Tomb Raider", "Portal",
      "Halo", "Call of Duty", "Uncharted", "Crash Bandicoot", "The Last of Us",
      "Doom", "Spore", "Guitar Hero", "Skyrim", "Resident Evil",
      "Street Fighter", "Mortal Kombat", "Fall Guys", "Angry Birds", "Subway Surfers",
      "Wii Sports", "Stardew Valley", "The Witcher 3", "The Sims", "Dark Souls",
      "Donkey Kong", "Metal Gear Solid", "Undertale", "Detroit: Become Human", "Half-Life"
    ]
  },
  pop_geek: {
    name: "Cultura Pop & Geek",
    icon: "⚡",
    description: "Iconos de internet, tecnología, memes, superhéroes y figuras destacadas de la cultura moderna.",
    color: "#ffcc00",
    words: [
      "Pikachu", "Luke Skywalker", "Yoda", "Darth Vader", "Steve Jobs", 
      "Bill Gates", "Elon Musk", "ChatGPT", "Inteligencia Artificial", "El Rubius", 
      "Ibai Llanos", "Homer Simpson", "Goku", "Naruto", "Steve de Minecraft", 
      "Barbie", "Don Quijote", "Sherlock Holmes", "Albert Einstein", "Batman",
      "Cereal con Agua", "El meme del novio distraído", "Julio Iglesias (y lo sabes)", "TikTok", "Instagram",
      "WhatsApp", "Steve Rogers (Capitán América)", "El Joker", "Mark Zuckerberg", "MrBeast",
      "Lego", "Funko Pop", "Rick y Morty", "Thor", "La Trifuerza", 
      "Keanu Reeves", "La nube de internet", "Meme de Doge", "Rickroll (Rick Astley)", "Criptomonedas", 
      "El anillo único", "Baby Yoda", "Deadpool", "Wolverine", "Capitana Marvel", 
      "Spock", "C-3PO", "Wikipedia", "Sauron", "Cereal con Leche"
    ]
  },
  musica: {
    name: "Música y Artistas",
    icon: "🎵",
    description: "Cantantes famosos, bandas históricas, canciones legendarias y géneros musicales.",
    color: "#cc33ff",
    words: [
      "Shakira", "Michael Jackson", "Queen", "Bad Bunny", "Rosalía", 
      "The Beatles", "Billie Eilish", "Eminem", "Taylor Swift", "Lady Gaga", 
      "Daft Punk", "Elvis Presley", "Bruno Mars", "Coldplay", "AC/DC", 
      "Dua Lipa", "Luis Miguel", "Daddy Yankee", "Avicii", "Bizarrap", 
      "Julio Iglesias", "Beethoven", "Mozart", "ABBA", "Elton John",
      "Freddie Mercury", "Rihanna", "Beyoncé", "Justin Bieber", "Ed Sheeran",
      "Madonna", "Pink Floyd", "Guns N' Roses", "David Bowie", "Harry Styles",
      "Adele", "Bob Marley", "Metallica", "Drake", "Karol G", 
      "Feid", "Myke Towers", "Rauw Alejandro", "Quevedo", "Britney Spears", 
      "One Direction", "KISS", "Katy Perry", "Avril Lavigne", "David Guetta"
    ]
  },
  mimica: {
    name: "Mímica y Acciones",
    icon: "🎭",
    description: "¡Solo gestos, sonidos o mímica! Acciones divertidas y situaciones para interpretar.",
    color: "#33ff66",
    words: [
      "Nadar con tiburones", "Astronauta flotando", "Domador de leones", "Enhebrar una aguja", "Robot bailando", 
      "Caminar sobre hielo", "Jugar al tenis", "Escalar una montaña", "Tocar la batería", "Cocinar una tortilla", 
      "Ser atacado por mosquitos", "Salto en paracaídas", "Pelar una cebolla y llorar", "Cambiar una rueda pinchada", "Pescar un pez gigante", 
      "Quedarse dormido de pie", "Ser un zombi hambriento", "Hacerse un selfie", "Pintar un cuadro", "Planchar una camisa", 
      "Tocar el violín", "Jugar al boliche", "Caminar como modelo de pasarela", "Domador de fieras", "Cortar el pelo a alguien",
      "Hacer de estatua", "Conducir un coche de carreras", "Escribir en ordenador muy rápido", "Limpiar cristales", "Buscar algo perdido en el suelo",
      "Tener mucho frío", "Tener mucho calor", "Hacer de mimo", "Bailar flamenco", "Tirar de una cuerda invisible",
      "Ser un bebé llorando", "Hacer pesas muy pesadas", "Cantar en la ducha", "Ser un gato lamiéndose", "Hacer de camarero con bandeja",
      "Ordeñar una vaca", "Dar un discurso importante", "Estar en una montaña rusa", "Jugar al golf", "Modelar arcilla",
      "Hacer de estatua de la libertad", "Escribir una carta de amor", "Barrer el suelo con una escoba rota", "Hacer malabares con manzanas", "Tener un ataque de risa incontrolable"
    ]
  },
  general: {
    name: "Cultura General y Objetos",
    icon: "💡",
    description: "Cosas cotidianas, monumentos famosos, conceptos científicos y objetos del día a día.",
    color: "#ff6633",
    words: [
      "Torre Eiffel", "Pizza", "Teléfono móvil", "Gravedad", "Submarino", 
      "Chocolate", "Semáforo", "Espejo", "Paraguas", "Reloj de arena", 
      "Papel higiénico", "Dinosaurio", "Telescopio", "Bicicleta", "Ajedrez", 
      "Microondas", "Pasaporte", "Mochila", "Guitarra", "Volcán", 
      "Biblioteca", "Internet", "Monopatín", "Maleta", "Dentista",
      "Estetoscopio", "Ventilador", "Termómetro", "Silla de oficina", "Calculadora",
      "Tijeras", "Auriculares", "Cámara de fotos", "Globo terráqueo", "Brújula",
      "Llave inglesa", "Cepillo de dientes", "Martillo", "Linterna", "Sacapuntas", 
      "Estación espacial", "Pirámides de Egipto", "Gran Muralla China", "El Coliseo de Roma", "El Amazonas", 
      "Un relámpago", "Un arcoíris", "Un iceberg", "Microscopio", "Extintor"
    ]
  }
};

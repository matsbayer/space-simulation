const canvas = document.getElementById('space-canvas');
const ctx = canvas.getContext('2d');

const PLANET_COUNT = 8; // Mehr Planeten
const PLANET_MIN_RADIUS = 28;
const PLANET_MAX_RADIUS = 48;
const PLANET_COLORS = ['#6cf', '#fc6', '#c6f', '#6f6', '#f66', '#ff6', '#6ff', '#fff'];
const EXPLOSION_DURATION = 30; // frames
const PLANET_MIN_SPEED = 0.3;
const PLANET_MAX_SPEED = 1.0;
const MAX_PLANETS = 8;
const SPAWN_INTERVAL = 120; // alle 2 Sekunden (bei 60 FPS)
let spawnTimer = 0;
const METEORITE_MIN_SPEED = 1.0;
const METEORITE_MAX_SPEED = 2.5;
const METEORITE_MIN_RADIUS = 8;
const METEORITE_MAX_RADIUS = 16;
const METEORITE_COLORS = ['#aaa', '#ccc', '#888', '#fff'];
const MAX_METEORITES = 9999; // Sehr viele Meteoriten erlaubt
const METEORITE_SPAWN_INTERVAL = 20; // Schnellere Spawnrate (alle ~0,33s)
let meteoriteSpawnTimer = 0;
const PLANET_RESPAWN_DELAY = 240; // Frames (4 Sekunden bei 60 FPS)
let meteoriteHailActive = false;

// === BILDER LADEN ===
const planetImages = [
    new Image(),
    new Image(),
    new Image(),
    new Image(),
    new Image(),
    new Image(),
    new Image()
];
planetImages[0].src = 'assets/planet1.png';
planetImages[1].src = 'assets/planet2.png';
planetImages[2].src = 'assets/planet3.png';
planetImages[3].src = 'assets/planet4.png';
planetImages[4].src = 'assets/planet5.png';
planetImages[5].src = 'assets/planet6.png';
planetImages[6].src = 'assets/planet7.png';

const meteoriteImage = new Image();
meteoriteImage.src = 'assets/meteorit.png';

const spaceshipImage = new Image();
spaceshipImage.src = 'assets/sraumschiff.png';

function randomBetween(a, b) {
    return a + Math.random() * (b - a);
}

class ExplosionParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = randomBetween(2, 5);
        this.color = color;
        this.vx = randomBetween(-3, 3);
        this.vy = randomBetween(-3, 3);
        this.life = randomBetween(15, 30);
        this.age = 0;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; // leichte "Schwerkraft"
        this.age++;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 1 - this.age / this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
    isAlive() {
        return this.age < this.life;
    }
}

class Planet {
    constructor(x, y, radius, color, vx, vy, imgIdx = null) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.radius = radius;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.alive = true;
        this.exploding = false;
        this.explosionFrame = 0;
        this.respawnTimer = 0;
        this.imgIdx = imgIdx !== null ? imgIdx : Math.floor(Math.random() * planetImages.length);
        this.rotation = Math.random() * 2 * Math.PI; // Zufällige Startrotation
        // Für sanftes "Wackeln"
        this.orbitAngle = Math.random() * 2 * Math.PI;
        this.orbitSpeed = randomBetween(0.005, 0.015);
        this.orbitRadius = randomBetween(2, 7);
    }

    draw(ctx) {
        if (this.exploding) {
            // Explosionseffekt
            ctx.save();
            ctx.globalAlpha = 1 - this.explosionFrame / EXPLOSION_DURATION;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + this.explosionFrame * 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff0';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + this.explosionFrame, 0, 2 * Math.PI);
            ctx.fillStyle = '#f00';
            ctx.fill();
            ctx.restore();
        } else {
            // Bild zeichnen
            const img = planetImages[this.imgIdx];
            if (img.complete) {
                ctx.save();
                ctx.imageSmoothingEnabled = true;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.closePath();
                ctx.clip();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
                ctx.restore();
            } else {
                // Fallback: Kreis
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.fillStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 20;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }

    update() {
        if (this.exploding) {
            this.explosionFrame++;
            if (this.explosionFrame > EXPLOSION_DURATION) {
                this.alive = false;
            }
            return;
        }
        // Sanfte Kreisbewegung um Mittelpunkt
        this.orbitAngle += this.orbitSpeed;
        this.x = this.baseX + Math.cos(this.orbitAngle) * this.orbitRadius;
        this.y = this.baseY + Math.sin(this.orbitAngle) * this.orbitRadius;
    }

    startExplosion() {
        if (!this.exploding) {
            this.exploding = true;
            this.explosionFrame = 0;
            // Partikel erzeugen
            for (let i = 0; i < 20 + Math.floor(this.radius); i++) {
                explosionParticles.push(new ExplosionParticle(
                    this.x,
                    this.y,
                    Math.random() < 0.5 ? '#ff0' : '#f00'
                ));
            }
        }
    }
}

class Meteorite extends Planet {
    constructor(x, y, radius, color, vx, vy) {
        super(x, y, radius, color, vx, vy);
        this.isMeteorite = true;
        // Für Meteoriten KEINE Orbit-Parameter nötig
    }
    update() {
        if (this.exploding) {
            this.explosionFrame++;
            if (this.explosionFrame > EXPLOSION_DURATION) {
                this.alive = false;
            }
            return;
        }
        // Nur lineare Bewegung für Meteoriten
        this.x += this.vx;
        this.y += this.vy;
        // Wenn Meteorit aus dem Bild fliegt, entfernen
        if (
            this.x + this.radius < 0 || this.x - this.radius > canvas.width ||
            this.y + this.radius < 0 || this.y - this.radius > canvas.height
        ) {
            this.alive = false;
        }
    }
    draw(ctx) {
        if (this.exploding) {
            // Explosion wie bei Planet
            ctx.save();
            ctx.globalAlpha = 1 - this.explosionFrame / EXPLOSION_DURATION;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + this.explosionFrame * 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff0';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + this.explosionFrame, 0, 2 * Math.PI);
            ctx.fillStyle = '#f00';
            ctx.fill();
            ctx.restore();
        } else {
            // Meteorit-Bild zeichnen, rotiert in Flugrichtung
            if (meteoriteImage.complete) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.closePath();
                ctx.clip();
                // Rotationswinkel berechnen (Feuer nach hinten, also entgegengesetzt zur Geschwindigkeit)
                let angle = Math.atan2(this.vy, this.vx) + Math.PI / 4 + Math.PI; // 180 Grad weiter
                ctx.translate(this.x, this.y);
                ctx.rotate(angle);
                ctx.drawImage(meteoriteImage, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
                ctx.restore();
            } else {
                // Fallback: Kreis
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.fillStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 20;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }
}

class BigMeteorite extends Meteorite {
    constructor(x, y, radius, color, vx, vy) {
        super(x, y, radius, color, vx, vy);
        this.isBig = true;
    }
    startExplosion() {
        // Ignoriert Explosion, bleibt am Leben
    }
    draw(ctx) {
        if (this.exploding) {
            ctx.save();
            ctx.globalAlpha = 1 - this.explosionFrame / EXPLOSION_DURATION;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + this.explosionFrame * 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff0';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + this.explosionFrame, 0, 2 * Math.PI);
            ctx.fillStyle = '#f00';
            ctx.fill();
            ctx.restore();
        } else {
            if (meteoriteImage.complete) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.closePath();
                ctx.clip();
                let angle = Math.atan2(this.vy, this.vx) + Math.PI / 4 + Math.PI;
                ctx.translate(this.x, this.y);
                ctx.rotate(angle);
                ctx.drawImage(meteoriteImage, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fill();
            }
        }
    }
}

class Spaceship extends Meteorite {
    constructor(x, y, vx, vy) {
        // radius und color wie beim BigMeteorite
        super(x, y, 38, '#fff', vx, vy);
        this.isSpaceship = true;
    }
    draw(ctx) {
        if (spaceshipImage.complete && spaceshipImage.naturalWidth > 0) {
            ctx.save();
            // Richtung berechnen (Spitze nach vorne, leicht nach rechts)
            let angle = Math.atan2(this.vy, this.vx) + Math.PI / 2 + Math.PI / 8;
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            // Nur das Raumschiff zeichnen, keine Flamme mehr
            ctx.drawImage(spaceshipImage, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
    }
    update() {
        // Kollisionsvermeidung mit Planeten und Meteoriten
        let avoidStrength = 0.22;
        let minDist = this.radius + PLANET_MAX_RADIUS + 32;
        let ax = 0, ay = 0;
        // Planeten
        for (let p of planets) {
            if (!p.alive) continue;
            let dx = this.x - p.x;
            let dy = this.y - p.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            // Explodiere, wenn zu nah
            if (dist < this.radius + p.radius - 5) {
                this.alive = false;
                for (let i = 0; i < 32; i++) {
                    explosionParticles.push(new ExplosionParticle(
                        this.x,
                        this.y,
                        '#fff'
                    ));
                }
                return;
            }
            if (dist < minDist) {
                let force = (minDist - dist) / minDist;
                ax += (dx / dist) * force * avoidStrength;
                ay += (dy / dist) * force * avoidStrength;
            }
        }
        // Meteoriten
        let minDistM = this.radius + METEORITE_MAX_RADIUS + 18;
        for (let m of meteorites) {
            if (!m.alive || m.isBig || m.isSpaceship) continue;
            let dx = this.x - m.x;
            let dy = this.y - m.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            // Explodiere, wenn zu nah
            if (dist < this.radius + m.radius - 5) {
                this.alive = false;
                for (let i = 0; i < 32; i++) {
                    explosionParticles.push(new ExplosionParticle(
                        this.x,
                        this.y,
                        '#fff'
                    ));
                }
                return;
            }
            if (dist < minDistM) {
                let force = (minDistM - dist) / minDistM;
                ax += (dx / dist) * force * avoidStrength;
                ay += (dy / dist) * force * avoidStrength;
            }
        }
        // Ausweichen vor anderen Raumschiffen
        let minDistS = this.radius * 2 + 12;
        for (let s2 of spaceships) {
            if (s2 === this || !s2.alive) continue;
            let dx = this.x - s2.x;
            let dy = this.y - s2.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistS) {
                let force = (minDistS - dist) / minDistS;
                ax += (dx / dist) * force * avoidStrength;
                ay += (dy / dist) * force * avoidStrength;
            }
        }
        // Kurs anpassen
        this.vx += ax;
        this.vy += ay;
        let v = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        let targetSpeed = 1.7;
        this.vx = (this.vx / v) * targetSpeed;
        this.vy = (this.vy / v) * targetSpeed;
        this.x += this.vx;
        this.y += this.vy;
        if (
            this.x + this.radius < 0 || this.x - this.radius > canvas.width ||
            this.y + this.radius < 0 || this.y - this.radius > canvas.height
        ) {
            this.alive = false;
        }
    }
}

function checkCollision(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < p1.radius + p2.radius;
}

// Planeten initialisieren (stationär, mit Mindestabstand)
function placePlanetsWithDistance(count, minDist) {
    let placed = [];
    let tries = 0;
    while (placed.length < count && tries < 1000) {
        let radius = randomBetween(PLANET_MIN_RADIUS, PLANET_MAX_RADIUS);
        let x = randomBetween(radius, canvas.width - radius);
        let y = randomBetween(radius, canvas.height - radius);
        let color = PLANET_COLORS[placed.length % PLANET_COLORS.length];
        let imgIdx = placed.length % planetImages.length;
        let tooClose = false;
        for (let p of placed) {
            let dx = p.x - x;
            let dy = p.y - y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < p.radius + radius + minDist) {
                tooClose = true;
                break;
            }
        }
        if (!tooClose) {
            placed.push({x, y, radius, color, imgIdx, respawnTimer: 0, alive: true});
        }
        tries++;
    }
    return placed;
}

let planetData = placePlanetsWithDistance(PLANET_COUNT, 60);
let planets = planetData.map(p => new Planet(p.x, p.y, p.radius, p.color, 0, 0, p.imgIdx));

let meteorites = [];
let explosionParticles = [];
let spaceships = [];

function spawnMeteorite() {
    if (meteorites.length >= MAX_METEORITES) return;
    // Meteorit spawnt am Rand (oben, unten, links oder rechts)
    let edge = Math.floor(randomBetween(0, 4));
    let x, y, angle;
    if (edge === 0) { // oben
        x = randomBetween(0, canvas.width);
        y = -METEORITE_MAX_RADIUS;
        angle = randomBetween(Math.PI / 4, (3 * Math.PI) / 4);
    } else if (edge === 1) { // unten
        x = randomBetween(0, canvas.width);
        y = canvas.height + METEORITE_MAX_RADIUS;
        angle = randomBetween((5 * Math.PI) / 4, (7 * Math.PI) / 4);
    } else if (edge === 2) { // links
        x = -METEORITE_MAX_RADIUS;
        y = randomBetween(0, canvas.height);
        angle = randomBetween(-Math.PI / 4, Math.PI / 4);
    } else { // rechts
        x = canvas.width + METEORITE_MAX_RADIUS;
        y = randomBetween(0, canvas.height);
        angle = randomBetween((3 * Math.PI) / 4, (5 * Math.PI) / 4);
    }
    let speed = randomBetween(METEORITE_MIN_SPEED, METEORITE_MAX_SPEED);
    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    let radius = randomBetween(METEORITE_MIN_RADIUS, METEORITE_MAX_RADIUS);
    let color = METEORITE_COLORS[Math.floor(Math.random() * METEORITE_COLORS.length)];
    meteorites.push(new Meteorite(x, y, radius, color, vx, vy));
}

// Button-Logik
window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('toggle-meteorites-btn');
    if (btn) {
        btn.textContent = 'Meteor Shower: OFF';
        btn.classList.add('off');
        btn.addEventListener('click', () => {
            meteoriteHailActive = !meteoriteHailActive;
            btn.textContent = meteoriteHailActive ? 'Meteor Shower: ON' : 'Meteor Shower: OFF';
            if (meteoriteHailActive) {
                btn.classList.remove('off');
            } else {
                btn.classList.add('off');
            }
        });
    }
    // Add Planet Button
    const addBtn = document.getElementById('add-planet-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            // Versuche bis zu 1000-mal einen Platz zu finden, der nicht kollidiert
            let tries = 0;
            let found = false;
            let radius, x, y, color, imgIdx;
            while (tries < 1000 && !found) {
                radius = randomBetween(PLANET_MIN_RADIUS, PLANET_MAX_RADIUS);
                x = randomBetween(radius, canvas.width - radius);
                y = randomBetween(radius, canvas.height - radius);
                color = PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)];
                imgIdx = Math.floor(Math.random() * planetImages.length);
                found = true;
                for (let p of planets) {
                    let dx = p.x - x;
                    let dy = p.y - y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < p.radius + radius + 10) { // 10px Puffer
                        found = false;
                        break;
                    }
                }
                tries++;
            }
            if (found) {
                let newPlanet = new Planet(x, y, radius, color, 0, 0, imgIdx);
                planets.push(newPlanet);
            }
            // Falls kein Platz gefunden, passiert nichts
        });
    }
    // Giant Meteorite Button
    const bigBtn = document.getElementById('big-meteorite-btn');
    if (bigBtn) {
        bigBtn.addEventListener('click', () => {
            // Spawne etwas außerhalb an einer zufälligen Position am Rand und fliege auf die Mitte des Canvas
            let x, y;
            const offset = 80;
            const rand = Math.floor(Math.random() * 4);
            if (rand === 0) { // oben
                x = randomBetween(0, canvas.width);
                y = -offset;
            } else if (rand === 1) { // unten
                x = randomBetween(0, canvas.width);
                y = canvas.height + offset;
            } else if (rand === 2) { // links
                x = -offset;
                y = randomBetween(0, canvas.height);
            } else { // rechts
                x = canvas.width + offset;
                y = randomBetween(0, canvas.height);
            }
            let targetX = canvas.width / 2;
            let targetY = canvas.height / 2;
            let angle = Math.atan2(targetY - y, targetX - x);
            let speed = randomBetween(3.5, 6.0);
            let vx = Math.cos(angle) * speed;
            let vy = Math.sin(angle) * speed;
            let radius = 80; // richtig groß
            let color = '#fff';
            meteorites.push(new BigMeteorite(x, y, radius, color, vx, vy));
        });
    }
    // Spaceship Button
    const shipBtn = document.getElementById('spaceship-btn');
    if (shipBtn) {
        shipBtn.addEventListener('click', () => {
            // Spawne an einer zufälligen Position am Rand und fliege auf die Mitte des Canvas
            let x, y;
            const offset = 0;
            const rand = Math.floor(Math.random() * 4);
            if (rand === 0) { // oben
                x = randomBetween(0, canvas.width);
                y = -offset;
            } else if (rand === 1) { // unten
                x = randomBetween(0, canvas.width);
                y = canvas.height + offset;
            } else if (rand === 2) { // links
                x = -offset;
                y = randomBetween(0, canvas.height);
            } else { // rechts
                x = canvas.width + offset;
                y = randomBetween(0, canvas.height);
            }
            let targetX = canvas.width / 2;
            let targetY = canvas.height / 2;
            let angle = Math.atan2(targetY - y, targetX - x);
            let speed = randomBetween(1.2, 2.2);
            let vx = Math.cos(angle) * speed;
            let vy = Math.sin(angle) * speed;
            spaceships.push(new Spaceship(x, y, vx, vy));
        });
    }
    meteoriteSpawnTimer = 0;
});

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Kollisionen zwischen Meteoriten und Planeten prüfen
    for (let m of meteorites) {
        for (let p of planets) {
            if (m.alive && p.alive && checkCollision(m, p)) {
                if (m.isBig) {
                    p.startExplosion(); // Nur Planet explodiert
                } else {
                    m.startExplosion();
                    p.startExplosion();
                    // Respawn-Timer für Planeten setzen
                    p.respawnTimer = PLANET_RESPAWN_DELAY;
                }
            }
        }
    }
    // Kollisionen zwischen BigMeteorite und Spaceship prüfen
    for (let m of meteorites) {
        if (m.alive && m.isBig) {
            for (let s of spaceships) {
                if (s.alive) {
                    let dx = m.x - s.x;
                    let dy = m.y - s.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < m.radius + s.radius) {
                        s.alive = false;
                        for (let i = 0; i < 32; i++) {
                            explosionParticles.push(new ExplosionParticle(
                                s.x,
                                s.y,
                                '#fff'
                            ));
                        }
                    }
                }
            }
        }
    }
    // Kollisionen zwischen Raumschiffen prüfen
    for (let i = 0; i < spaceships.length; i++) {
        let s1 = spaceships[i];
        if (!s1.alive) continue;
        for (let j = i + 1; j < spaceships.length; j++) {
            let s2 = spaceships[j];
            if (!s2.alive) continue;
            let dx = s1.x - s2.x;
            let dy = s1.y - s2.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < s1.radius + s2.radius) {
                s1.alive = false;
                s2.alive = false;
                for (let k = 0; k < 32; k++) {
                    explosionParticles.push(new ExplosionParticle(
                        s1.x,
                        s1.y,
                        '#fff'
                    ));
                    explosionParticles.push(new ExplosionParticle(
                        s2.x,
                        s2.y,
                        '#fff'
                    ));
                }
            }
        }
    }
    // Planeten updaten und zeichnen
    for (let planet of planets) {
        if (planet.alive) {
            planet.update();
            planet.draw(ctx);
        }
    }
    // Meteoriten updaten und zeichnen
    // Zuerst normale Meteoriten
    for (let m of meteorites) {
        if (m.alive && !m.isBig) {
            m.update();
            m.draw(ctx);
        }
    }
    // Dann BigMeteorites
    for (let m of meteorites) {
        if (m.alive && m.isBig) {
            m.update();
            m.draw(ctx);
        }
    }
    // Explosion-Partikel updaten und zeichnen
    for (let p of explosionParticles) {
        p.update();
        p.draw(ctx);
    }
    // Spaceships updaten und zeichnen
    for (let s of spaceships) {
        if (s.alive) {
            s.update();
            s.draw(ctx);
        }
    }
    spaceships = spaceships.filter(s => s.alive);

    // Neue Meteoriten spawnen
    if (meteoriteHailActive) {
        meteoriteSpawnTimer++;
        if (meteoriteSpawnTimer >= METEORITE_SPAWN_INTERVAL) {
            spawnMeteorite();
            meteoriteSpawnTimer = 0;
        }
    }

    requestAnimationFrame(animate);
}

animate(); 
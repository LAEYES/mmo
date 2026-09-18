# FreedomArena Android

## Build APK
1. Ouvrir `UnityMMOProject` dans Unity avec le module **Android Build Support** installé.
2. Ouvrir la scène FreedomArena.
3. Ajouter/activer la scène dans **File > Build Settings**.
4. Utiliser **FreedomArena > Android > Build APK**.
5. L'APK est généré dans `Builds/Android/FreedomArena.apk`.

## Mobile
- Paysage Android.
- Joystick tactile.
- Attaque tactile.
- Inventaire / Quêtes / Personnage / Menu tactiles.
- Cible runtime : 60 FPS.
- Les contrôles clavier restent disponibles pour les tests dans l'éditeur.

## Note
Le dépôt contient maintenant le pipeline de build et les contrôles Android. La compilation finale de l'APK doit être exécutée dans un environnement Unity disposant du module Android Build Support et d'un SDK/JDK Android configuré.

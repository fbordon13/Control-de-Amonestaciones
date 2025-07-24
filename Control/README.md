# Registro de Amonestaciones - Plataforma Educativa

Sistema web profesional y fácil de usar para registrar, consultar y gestionar amonestaciones de estudiantes, con autenticación y almacenamiento seguro en Firebase.

## 🚀 Instrucciones rápidas

1. **Clona o descarga este repositorio.**
2. **Crea un proyecto en [Firebase](https://console.firebase.google.com/).**
3. **Activa Authentication (correo/contraseña) y Firestore.**
4. **Copia las credenciales de tu proyecto en `firebase-config.js`.**
5. **Abre `index.html` en tu navegador.**

## 🔑 Roles de usuario
- **Docente:** Puede ver, registrar, editar y eliminar solo sus propias amonestaciones.
- **Directora:** Puede ver, buscar, editar y eliminar todas las amonestaciones.

## ⚙️ Configuración de roles
Puedes crear una colección `usuarios` en Firestore con documentos cuyo ID sea el UID del usuario y un campo `rol` con valor `docente` o `directora`.

## 🔒 Reglas de seguridad sugeridas para Firestore
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /amonestaciones/{amonestacion} {
      allow read, update, delete: if request.auth != null && (
        get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'directora' ||
        (get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'docente' &&
         resource.data.docenteUid == request.auth.uid)
      );
      allow create: if request.auth != null;
    }
    match /usuarios/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }
  }
}
```

## 📝 Notas
- El sistema es responsive y funciona en escritorio y móvil.
- El código está comentado para facilitar el mantenimiento.
- Puedes personalizar los estilos en `styles.css`.

---

¿Dudas? ¡Contáctame! 
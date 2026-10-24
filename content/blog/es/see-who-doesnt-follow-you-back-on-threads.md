---
title: "Cómo Ver Quién No Te Sigue de Vuelta en Threads Sin Iniciar Sesión"
description: "Descubre quién no te sigue de vuelta en Threads con la exportación oficial de Meta. Sin login ni contraseña, análisis en tu navegador y ajustes correctos."
date: 2026-10-24
slug: "see-who-doesnt-follow-you-back-on-threads"
cluster: "instagram-unfollow"
keywords:
  - "quién no me sigue de vuelta en threads"
  - "verificador de unfollow threads"
  - "quién me dejó de seguir en threads"
  - "exportar seguidores de threads"
  - "SafeUnfollow"
---
Para ver quién no te sigue de vuelta en Threads, exporta los datos de tu perfil de Threads desde el Centro de cuentas de Meta y compara las listas de seguidores y seguidos que trae el archivo. Threads no tiene una vista de "no me sigue de vuelta", y la mayoría de las apps que la ofrecen piden tu login. La exportación da la misma respuesta a partir de un archivo que tú controlas.

Esta guía explica la configuración de exportación que funciona, qué lee SafeUnfollow del archivo y qué puede y qué no puede decirte una sola exportación.

## Por qué Threads necesita su propia exportación

Los perfiles de Threads se gestionan desde el Centro de cuentas de Meta, el mismo lugar donde exportas los datos de Instagram. Por eso es fácil pensar que una exportación sirve para ambos. No es así. Meta exporta cada perfil por separado: el ZIP de Instagram no tiene seguidores de Threads, y el ZIP de Threads no tiene seguidores de Instagram.

La otra diferencia sorprende a mucha gente. En Instagram puedes exportar solo "Seguidores y seguidos". Threads no tiene esa opción. Seleccionas toda la categoría "Threads", que también incluye tus publicaciones y archivos multimedia. Por eso importa la calidad multimedia: elige Baja para que el archivo sea pequeño.

## Cómo exportar tus seguidores y seguidos de Threads

1. Abre el Centro de cuentas y ve a **Tu información y permisos → Exportar tu información → Crear exportación**.
2. Elige tu perfil de **Threads**, no el de Instagram.
3. Selecciona solo **Threads** como información a incluir.
4. Elige **Todo el período**, formato **JSON** y calidad multimedia **Baja**.
5. Cuando Meta te avise de que la exportación está lista, descarga el ZIP.
6. Sube el ZIP a [SafeUnfollow](/es/upload) sin descomprimirlo.

Dos ajustes causan la mayoría de los errores. Una exportación en **HTML** no se puede leer, así que solicita otra en JSON. Un período corto, como "Último año", puede dejar fuera seguidores de años anteriores, así que elige siempre Todo el período.

## Qué lee SafeUnfollow del archivo

El ZIP de Threads contiene mucho más que tus listas de seguidores. SafeUnfollow ignora tus publicaciones y archivos multimedia y lee solo las listas de seguidores y seguidos.

El análisis se hace en tu navegador. SafeUnfollow no sube tu exportación a sus servidores y nunca te pide la contraseña de Threads o Instagram. No hay login, OAuth ni conexión por API, así que no existe un token de sesión que alguien pueda usar mal. Es una forma de responder la pregunta centrada en la privacidad, sin tocar tu cuenta.

Con esas dos listas ves tres grupos:

- **Solo tú sigues**: cuentas que sigues en Threads y que no te siguen
- **Solo te siguen**: cuentas que te siguen y a las que no sigues de vuelta
- **Mutuos**: cuentas en las que el follow es en ambos sentidos

Las primeras 20 cuentas de cada lista son gratis. El acceso de por vida (un pago único de US$14.99, ajustado a tu país, sin suscripción) desbloquea listas completas, búsqueda, exportación CSV, instantáneas ilimitadas e historial de cambios.

## No seguir de vuelta no es lo mismo que dejar de seguir

Una exportación es una foto de tus relaciones el día en que Meta preparó el archivo. Muestra quién no te sigue de vuelta ahora. No dice si esas cuentas te siguieron alguna vez y dejaron de hacerlo, o si nunca te siguieron.

Para ver quién te dejó de seguir en Threads, guarda el resultado como instantánea, solicita otra exportación más adelante y compáralas. Las cuentas que aparecen en la lista de seguidores antigua y no en la nueva dejaron de seguirte en algún momento entre las dos fechas. El mismo método funciona en Instagram, y nuestra guía sobre [rastrear los cambios de seguidores a lo largo del tiempo](/es/blog/track-instagram-follower-changes-over-time) lo explica en detalle.

Las instantáneas solo se comparan dentro de la misma plataforma. Una instantánea de Threads nunca se compara con una de Instagram, porque las listas de seguidores son distintas.

## Límites antes de empezar

- Meta decide cuánto tarda la exportación. Solicítala antes de necesitar el resultado.
- La comparación muestra que algo cambió entre dos fechas, no el día exacto.
- Una cuenta desactivada o eliminada desaparece de la lista igual que un unfollow, así que no se pueden distinguir.
- Si Meta cambia el formato de exportación, el lector puede necesitar una actualización antes de leer archivos nuevos.

## Preguntas frecuentes (FAQ)

### ¿SafeUnfollow necesita mi contraseña de Threads o Instagram?

No. Funciona solo con el archivo que descargas de Meta. No hay login, OAuth ni conexión por API.

### ¿Puedo usar mi exportación de datos de Instagram para Threads?

No. Meta exporta cada perfil por separado. La exportación de datos de Instagram no incluye seguidores de Threads, así que exporta tu perfil de Threads aparte.

### ¿Por qué mi exportación de Threads es tan grande?

Threads no tiene una opción solo de seguidores, así que el ZIP incluye publicaciones y archivos multimedia. La calidad multimedia Baja reduce el tamaño. SafeUnfollow lee solo las listas de seguidores de todos modos.

### ¿Subo el ZIP o lo descomprimo antes?

Sube el ZIP tal como está. SafeUnfollow encuentra dentro los archivos de seguidores y seguidos.

### ¿Funciona también para TikTok?

Sí. TikTok usa su propio archivo de "Descargar tus datos", y los pasos son distintos. Mira [cómo revisar tus seguidores de TikTok](/es/blog/see-who-doesnt-follow-you-back-on-tiktok).

¿Quieres la versión corta? La página del [verificador de unfollow en Threads](/es/threads-unfollow-checker) muestra los pasos en una pantalla.

Comienza con la [guía completa de Instagram Unfollow](/pillars/instagram-unfollow-guide) para una visión general del tema.

## Artículos relacionados

- [Cómo Analizar tu Exportación de Datos de Instagram Sin Iniciar Sesión](/es/blog/how-to-analyze-instagram-data-export)

[Sube tus datos de Threads a SafeUnfollow](https://safeunfollow.com/es/upload)

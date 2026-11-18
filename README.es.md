# annotate

[Web](https://codecruz.github.io/annotate/) · [English](README.md)

Señala cosas en la web que tienes en local, escribe qué quieres cambiar y
deja que Claude Code lo haga.

`annotate` es un plugin de Claude Code con una skill. Arranca un proxy local
pequeño delante de la web que ya estás sirviendo, añade una capa de anotación
a cada página y guarda tus notas en `.annotations.json`, dentro del proyecto.
Cuando terminas, Claude lee el archivo y hace el trabajo.

## Cómo funciona

1. Ejecuta `/annotate:start`, o simplemente pídelo ("quiero anotar la web").
2. Abre la dirección que te da, pulsa **Anotar**, haz clic en un elemento y
   escribe la nota. Los pines numerados marcan tus notas; **Notas** las lista
   todas, también las de otras páginas.
3. Ejecuta `/annotate:apply`, o dile a Claude que has terminado. Busca el código de cada elemento marcado,
   hace el cambio y borra la nota. Los pines que quedan son trabajo pendiente.

| Comando | Qué hace |
| --- | --- |
| `/annotate:start [url o puerto]` | Abre una sesión sobre tu web local. |
| `/annotate:apply` | Aplica las notas y borra las resueltas. |
| `/annotate:stop` | Cierra la sesión. Las notas abiertas se conservan. |

Cada nota guarda la página, un selector, el texto y el HTML del elemento, el
tamaño de la ventana y el tema de color, para que «esto es demasiado grande
en móvil» llegue con su contexto.

## Instalación

En Claude Code:

```
/plugin marketplace add codecruz/claude-plugins
/plugin install annotate@codecruz
```

Después abre una sesión nueva o ejecuta `/reload-plugins`.

## Requisitos y límites

- Node 18 o superior. Sin dependencias.
- El proxy solo reenvía a `localhost` y solo escucha en `127.0.0.1`.
- Las notas se ponen sobre elementos, no sobre zonas libres ni texto
  seleccionado.
- No reenvía WebSockets, así que la recarga en caliente no funciona a través
  del proxy: recarga la página después de un cambio.
- Una Content-Security-Policy estricta en una etiqueta `<meta>` bloquea la
  capa.

## Licencia

MIT

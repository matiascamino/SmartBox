# SmartBox

**Proyecto de Cerrojo Inteligente con ESP32, Backend en Node.js y Frontend en React**  

**Integrantes:**  
- Buffa Matías  
- Camino Matías  
- Sereno Facundo José  

**Carrera:** Ingeniería en Sistemas  
**Universidad:** UTN San Francisco  
**Año:** 2025  
**Materia:** Comunicación de Datos (3º año)  

---

## Descripción

SmartBox es un sistema de cerradura electrónica inteligente que permite controlar y monitorear el acceso a una caja fuerte mediante un ESP32.  
El ESP32 se comunica con un backend desarrollado en Node.js y PostgreSQL, registrando todos los eventos de la cerradura y del sensor de la puerta.  
El frontend, desarrollado en React, permite a los usuarios visualizar el estado de la caja, abrir o cerrar el cerrojo y revisar un historial de movimientos y alertas de seguridad.

El sistema incluye:
- Control de cerrojo vía web y teclado matricial (keypad).  
- Monitoreo del estado de la puerta mediante sensor magnético.  
- Registro de eventos en la base de datos (aperturas, cierres, alarmas).  
- Notificaciones por correo electrónico en caso de eventos de alarma.  
- Visualización de eventos con filtros por fecha, origen, estado del cerrojo y alarma.

---

## Tecnologías usadas

**Hardware:**
- ESP32 (firmware en Arduino IDE)  
- Servo motor para el cerrojo  
- Sensor magnético para la puerta  
- Keypad 4x4 para ingreso de PIN  
- LEDs y buzzer para notificaciones locales  

**Backend:**
- Node.js  
- Express  
- PostgreSQL  
- Sendgrid (para envío de emails)  

**Frontend:**
- React  
- Vite  
- Material-UI (componentes y diseño)  

---



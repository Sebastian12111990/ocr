import cv2

cap = cv2.VideoCapture(1)

ancho = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
alto = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

if not cap.isOpened():
    raise RuntimeError("No se pudo abrir la camara. Prueba cambiando el indice 1 por 0.")

# Evita acumular demasiados fotogramas atrasados, si el dispositivo lo permite.
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

x = ancho//2
y = alto //2

w = ancho//4
h = alto //4

try:
    while True:
        ret, frame = cap.read()

        if not ret:
            print("No se pudo leer un fotograma de la camara.")
            break

        # gris = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        cv2.rectangle( frame, (x, y) , (x+w, y+h), color = (0, 0, 255), thickness=4 )
        cv2.imshow("Camara - presiona Q para salir", frame)

        # waitKey procesa los eventos de la ventana y evita que se congele.
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
finally:
    cap.release()
    cv2.destroyAllWindows()

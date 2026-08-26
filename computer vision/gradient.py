import cv2

from funciones_imagen import cargar_imagen, display_img


img = cargar_imagen("imagenes/crucigrama.jpg", cv2.IMREAD_GRAYSCALE)

display_img(img)


sobelx = cv2.Sobel(img, cv2.CV_64F, 1, 0, ksize=5)
display_img(sobelx)

sobely = cv2.Sobel(img, cv2.CV_64F, 0, 1, ksize=5)
display_img(sobely)

imga_final = cv2.addWeighted(src1=sobelx, alpha=0.5, src2=sobely, beta=0.5, gamma=0)
display_img(imga_final)

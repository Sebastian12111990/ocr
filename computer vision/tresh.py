import cv2
import matplotlib.pyplot as plt
#matplotlib inline

img = cv2.imread('./imagenes/crucigrama.jpg', 0)
 
fig = plt.figure(figsize=(10, 10))
ax = fig.add_subplot(111)


corte, threshold1 = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY)

ax.imshow(threshold1, cmap='gray')
plt.show()

threshold3 = cv2.adaptiveThreshold(
    img, 255,
    cv2.ADAPTIVE_THRESH_MEAN_C,
    cv2.THRESH_BINARY,
    11, 10
)

fig = plt.figure(figsize=(10, 10))
ax = fig.add_subplot(111)
ax.imshow(threshold3, cmap='gray')
plt.show()

mezcla = cv2.addWeighted(src1=threshold1, alpha= 0.5, src2 = threshold3 , beta = 0.5, gamma = 0)
fig = plt.figure(figsize=(10, 10))
ax = fig.add_subplot(111)
ax.imshow(mezcla, cmap='gray')
plt.show()

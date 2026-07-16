import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonCard,
  IonCardContent,
} from "@ionic/react";
import {
  IonAccordion,
  IonAccordionGroup,
  IonItem,
  IonLabel,
} from "@ionic/react";
import { usePushNotifications } from "../hooks";
import "./Home.css";

function Example() {
  const { token, error, requestingPermission, requestNotificationPermission } =
    usePushNotifications();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Notificaciones</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonCard>
          <IonCardContent>
            <h2>Habilitar Notificaciones</h2>
            {!token ? (
              <>
                <p>Haz click en el botón para recibir notificaciones</p>
                <IonButton
                  expand="block"
                  onClick={requestNotificationPermission}
                  disabled={requestingPermission}
                >
                  {requestingPermission
                    ? "Cargando..."
                    : "Habilitar Notificaciones"}
                </IonButton>
              </>
            ) : (
              <>
                <p style={{ color: "green" }}>Notificaciones habilitadas</p>
                <p style={{ fontSize: "12px", wordBreak: "break-all" }}>
                  Token: {token}
                </p>
              </>
            )}
            {error && <p style={{ color: "red" }}>Error: {error}</p>}
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardContent>
            <IonAccordionGroup>
              <IonAccordion value="first">
                <IonItem slot="header" color="light">
                  <IonLabel>First Accordion</IonLabel>
                </IonItem>
                <div className="ion-padding" slot="content">
                  First Content
                </div>
              </IonAccordion>
              <IonAccordion value="second">
                <IonItem slot="header" color="light">
                  <IonLabel>Second Accordion</IonLabel>
                </IonItem>
                <div className="ion-padding" slot="content">
                  Second Content
                </div>
              </IonAccordion>
              <IonAccordion value="third">
                <IonItem slot="header" color="light">
                  <IonLabel>Third Accordion</IonLabel>
                </IonItem>
                <div className="ion-padding" slot="content">
                  Third Content
                </div>
              </IonAccordion>
            </IonAccordionGroup>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}

export default Example;

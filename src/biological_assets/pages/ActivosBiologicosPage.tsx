import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { RegistryView } from './RegistryView';
import { RegistrarActivoPage } from './RegistrarActivoPage';
import { AuditoriaM02View } from './AuditoriaM02View';
import { ActivoDetallePage } from './ActivoDetallePage';

/**
 * Shell del módulo Activos Biológicos.
 * Rutas anidadas — el orden importa (literales antes que :id).
 */
export function ActivosBiologicosPage() {
  return (
    <Switch>
      <Route exact path="/activos-biologicos" component={RegistryView} />
      <Route exact path="/activos-biologicos/nuevo" component={RegistrarActivoPage} />
      <Route exact path="/activos-biologicos/auditoria" component={AuditoriaM02View} />
      <Route path="/activos-biologicos/:id" component={ActivoDetallePage} />
    </Switch>
  );
}

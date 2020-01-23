// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import es from 'vuetify/src/locale/es';

export default {
  $vuetify: es,
  App: {
    profileTitle: 'Perfil',
    routesTitle: 'Rutas',
    statsTitle: 'Estadísticas',
  },
  ClimbDropdown: {
    // TODO: http://www.notlostjustdiscovering.com/spanish-climbing-vocabulary/
    // says 'Lead' is 'Puntear', while
    // http://rlcolearnspanish.com/vocabulary/spanish-for-rock-climbers-theme-based-vocabulary-learning/
    // says 'Ir de primero'.
    leadAbbrev: 'L',
    leadItem: 'Lead',
    notClimbedItem: 'No escalado',
    // TODO: https://www.reddit.com/r/climbing/comments/29laoe/climbing_vocabulary_in_spanish/
    // says 'Top-rope' is 'en yo-yo'.
    topRopeAbbrev: 'TR',
    topRopeItem: 'Top-rope',
  },
  Profile: {
    alreadyCreatingTeamError: 'Ya creando equipo',
    alreadyJoiningTeamError: 'Ya uniendo equipo',
    alreadyLeavingTeamError: 'Ya dejando equipo',
    badInviteCodeError: 'Código de invitado incorrecto',
    cancelButton: 'Cancelar',
    cantFindUnusedCodeError: 'No puede encontrar el código no utilizado',
    createTeamButton: 'Crear equipo',
    createTeamTitle: 'Crear equipo',
    createTeamText:
      'Después de crear un nuevo equipo, recibirá un código de invitado ' +
      'para darle a su compañero de equipo para que puedan unirse.',
    createdTeamMessage: '"{0}" creado y unido',
    dismissButton: 'Descartar',
    failedCreatingTeamError: 'Error al crear el equipo: {0}',
    failedJoiningTeamError: 'Falló en unirse al equipo: {0}',
    failedLeavingTeamError: 'Falló al dejar el equipo: {0}',
    failedLoadingDataError: 'Falló al cargar datos: {0}',
    failedSettingTeamNameError: 'Error al establecer el nombre de equipo: {0}',
    failedSettingUserNameError: 'Error al establecer el nombre de usuario: {0}',
    individualTitle: 'Individual',
    invalidTeamInfoError: 'Información de equipo inválido',
    invalidTeamNameError: 'Nombre de equipo inválido',
    invalidUserNameError: 'Nombre de usuario inválido',
    inviteCodeText:
      'Su compañero de equipo puede ingresar este código ' +
      'en su perfil para unirse a su equipo. No se lo muestres a nadie más.',
    inviteCodeLabel: 'Código de invitado',
    inviteCodeLengthRule: 'El código debe tener {0} dígitos',
    inviteCodeTitle: 'Código de invitado',
    joinedTeamMessage: '"{0}" unido',
    joinTeamButton: 'Unirse al equipo',
    joinTeamText:
      'Pídale a su compañero de equipo que le dé el código de invitado ' +
      'de {0} dígitos de su página de perfil.',
    joinTeamTitle: 'Unirse al equipo',
    leaveTeamButton: 'Dejar equipo',
    leaveTeamText: '¿Estás seguro de que quieres dejar tu equipo?',
    leftTeamMessage: '{0} dejado',
    nameEmptyRule: 'El nombre no debe estar vacío',
    nameTooLongRule: 'El nombre debe tener {0} caracteres o menos',
    notOnTeamText: 'No estás en un equipo.',
    showInviteCodeButton: 'Mostrar código de invitado',
    teamFullError: 'El equipo está lleno',
    teamMemberLeftLabel: '(salido)',
    teamMembersLabel: 'Miembros',
    teamNameLabel: 'Nombre de equipo',
    teamTitle: 'Equipo',
    yourNameLabel: 'Tu nombre',
  },
  Routes: {
    applyButton: 'Aplicar',
    cancelButton: 'Cancelar',
    competitionEndedMessage: 'La competencia terminó',
    failedLoadingConfigError: 'Falló al cargar la configuración: {0}',
    failedLoadingRoutesError: 'Falló al cargar las rutas: {0}',
    failedLoadingUserOrTeamError: 'Falló al cargar usuario o equipo: {0}',
    failedSettingClimbStateError:
      'Falló al establecer el estado de ascenso: {0}',
    failedUpdatingFiltersError: 'Falló al actualizar los filtros: {0}',
    gradeRangeLabel: 'Grados: {0} a {1}',
    offlineUnsupportedMessage: 'El modo fuera de línea no compatible',
    routeFiltersTitle: 'Filtros de rutas',
    timeUntilStartMessage: '{0} hasta que comience la competencia',
    timeRemainingMessage: '{0} restantes',
  },
  RoutesNav: {
    filtersButton: 'Filtros',
  },
  Statistics: {
    areasClimbedStat: 'Áreas escaladas',
    climbsCard: 'Ascensos',
    failedLoadingRoutesError: 'Falló al cargar las rutas: {0}',
    failedLoadingUserOrTeamError: 'Falló al cargar usuario o equipo: {0}',
    individualTab: 'Individual',
    leadStat: 'Lead', // TODO: See ClimbDropdown above.
    pointsCard: 'Puntos',
    teamTab: 'Equipo',
    topRopeStat: 'Top-rope', // TODO: See ClimbDropdown above.
    totalClimbsStat: 'Ascensos totales',
    totalPointsStat: 'Puntos totales',
  },
  Toolbar: {
    profileItem: 'Perfil',
    routesItem: 'Rutas',
    signOutCancelButton: 'Cancelar',
    signOutConfirmButton: 'Confirmar',
    signOutItem: 'Cerrar sesión',
    signOutTitle: 'Cerrar sesión',
    signOutText: '¿Estás seguro de que quieres cerrar sesión?',
    statisticsItem: 'Estadísticas',
  },
};

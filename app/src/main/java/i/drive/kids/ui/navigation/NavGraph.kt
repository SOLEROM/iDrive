package i.drive.kids.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import i.drive.kids.ui.screen.childdetail.ChildDetailScreen
import i.drive.kids.ui.screen.children.ChildrenScreen
import i.drive.kids.ui.screen.dashboard.DashboardScreen
import i.drive.kids.ui.screen.eventeditor.EventEditorScreen
import i.drive.kids.ui.screen.events.EventsScreen
import i.drive.kids.ui.screen.myrides.MyRidesScreen
import i.drive.kids.ui.screen.notifications.NotificationsScreen
import i.drive.kids.ui.screen.onboarding.OnboardingScreen
import i.drive.kids.ui.screen.ridesboard.RidesBoardScreen
import i.drive.kids.ui.screen.settings.SettingsScreen
import i.drive.kids.ui.screen.signin.SignInScreen
import i.drive.kids.ui.screen.splash.SplashScreen
import i.drive.kids.ui.screen.syncstatus.SyncStatusScreen

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object SignIn : Screen("signin")
    object Onboarding : Screen("onboarding")
    object Dashboard : Screen("dashboard")
    object RidesBoard : Screen("rides")
    object MyRides : Screen("myrides")
    object Events : Screen("events")
    object EventEditorNew : Screen("eventeditor")
    object EventEditor : Screen("eventeditor/{eventId}") {
        fun of(eventId: String) = "eventeditor/$eventId"
    }
    object Children : Screen("children")
    object ChildDetail : Screen("child/{childId}") {
        fun of(childId: String) = "child/$childId"
    }
    object Notifications : Screen("notifications")
    object SyncStatus : Screen("syncstatus")
    object Settings : Screen("settings")
}

@Composable
fun NavGraph() {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = Screen.Splash.route) {
        composable(Screen.Splash.route) {
            SplashScreen(onNavigateToSignIn = {
                nav.navigate(Screen.SignIn.route) {
                    popUpTo(Screen.Splash.route) { inclusive = true }
                }
            })
        }
        composable(Screen.SignIn.route) {
            SignInScreen(onNavigateToOnboarding = {
                nav.navigate(Screen.Onboarding.route) {
                    popUpTo(Screen.SignIn.route) { inclusive = true }
                }
            })
        }
        composable(Screen.Onboarding.route) {
            OnboardingScreen(onNavigateToDashboard = {
                nav.navigate(Screen.Dashboard.route) {
                    popUpTo(Screen.Onboarding.route) { inclusive = true }
                }
            })
        }
        composable(Screen.Dashboard.route) {
            DashboardScreen(
                onNavigateToRides = { nav.navigate(Screen.RidesBoard.route) },
                onNavigateToEvents = { nav.navigate(Screen.Events.route) },
                onNavigateToChildren = { nav.navigate(Screen.Children.route) },
                onNavigateToMyRides = { nav.navigate(Screen.MyRides.route) },
                onNavigateToNotifications = { nav.navigate(Screen.Notifications.route) },
                onNavigateToSyncStatus = { nav.navigate(Screen.SyncStatus.route) },
                onNavigateToSettings = { nav.navigate(Screen.Settings.route) },
            )
        }
        composable(Screen.RidesBoard.route) { RidesBoardScreen() }
        composable(Screen.MyRides.route) { MyRidesScreen() }
        composable(Screen.Events.route) {
            EventsScreen(
                onNavigateToNewEvent = { nav.navigate(Screen.EventEditorNew.route) },
                onNavigateToEvent = { id -> nav.navigate(Screen.EventEditor.of(id)) },
            )
        }
        composable(Screen.EventEditorNew.route) {
            EventEditorScreen(onNavigateBack = { nav.popBackStack() })
        }
        composable(
            route = Screen.EventEditor.route,
            arguments = listOf(navArgument("eventId") { type = NavType.StringType }),
        ) {
            EventEditorScreen(onNavigateBack = { nav.popBackStack() })
        }
        composable(Screen.Children.route) {
            ChildrenScreen(
                onNavigateToChild = { id -> nav.navigate(Screen.ChildDetail.of(id)) },
            )
        }
        composable(
            route = Screen.ChildDetail.route,
            arguments = listOf(navArgument("childId") { type = NavType.StringType }),
        ) {
            ChildDetailScreen(onNavigateBack = { nav.popBackStack() })
        }
        composable(Screen.Notifications.route) { NotificationsScreen() }
        composable(Screen.SyncStatus.route) { SyncStatusScreen() }
        composable(Screen.Settings.route) { SettingsScreen() }
    }
}

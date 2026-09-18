#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace RPGQGMMO.Editor
{
    public static class RPGQGAndroidBuild
    {
        [MenuItem("FreedomArena/Android/Build APK")]
        public static void BuildApk()
        {
            PlayerSettings.companyName = "FreedomArena";
            PlayerSettings.productName = "FreedomArena MMO";
            PlayerSettings.bundleVersion = "0.1.0";

            PlayerSettings.defaultScreenOrientation = ScreenOrientation.LandscapeLeft;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;

            EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android);

            string[] scenes = GetEnabledScenes();
            if (scenes.Length == 0)
            {
                Debug.LogError("FreedomArena: aucune scène activée dans Build Settings.");
                return;
            }

            string output = "Builds/Android/FreedomArena.apk";
            BuildPlayerOptions options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = output,
                target = BuildTarget.Android,
                options = BuildOptions.None
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result == BuildResult.Succeeded)
                Debug.Log("FreedomArena Android APK créé : " + output);
            else
                Debug.LogError("FreedomArena Android build échoué : " + report.summary.result);
        }

        private static string[] GetEnabledScenes()
        {
            var list = new System.Collections.Generic.List<string>();
            foreach (EditorBuildSettingsScene scene in EditorBuildSettings.scenes)
                if (scene.enabled && !string.IsNullOrEmpty(scene.path))
                    list.Add(scene.path);
            return list.ToArray();
        }
    }
}
#endif

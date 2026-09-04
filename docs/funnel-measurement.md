# Funnel measurement

Added September 4, 2026. New events are not retroactive.

| Event | Trigger |
| --- | --- |
| upload_started | File selected/dropped, before format validation |
| analysis_completed | Parsing and existing browser-cache write both succeeded |
| upload_failed | Unsupported format, parser error or browser-cache failure |
| snapshot_save_started | Save button pressed |
| snapshot_saved | Snapshot storage write succeeded, not merely a click |
| snapshot_save_failed | Invalid metadata, duplicate, Premium gate or storage failure |

`failure_reason` contains only fixed categories; never exception text, filenames, profile labels, ZIP fingerprints or account lists. `language` is included. Analytics exceptions cannot prevent the operation.

GA4: Reports → View user engagement & retention → Events. Event-scoped custom dimension `Failure reason` (`failure_reason`) was created and verified in property 528692915 on September 4, 2026. It can be used for failure breakdowns in explorations after data processing.

Attempt-based upload completion ratio: analysis_completed / upload_started. Save-attempt completion ratio: snapshot_saved / snapshot_save_started. These are event ratios, not deduplicated user funnels. For the analysis → save funnel use ordered user/session analysis in GA; cached analysis may be saved on a later visit without another analysis_completed event.

Premium gate and duplicate saves are expected outcomes, not application crashes. Missing completion alone is not proof of failure (abandonment, blocked analytics and retries may contribute). Provider purchases remain separate from checkout clicks. Exclude known test traffic when interpreting results.

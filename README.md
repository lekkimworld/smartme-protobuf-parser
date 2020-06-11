
https://www.any-api.com/smart_me_com/smart_me_com/docs/Definitions/SmartMeDeviceConfigurationContainer

with bar as (with foo as (select dt, value from samples where value > 0 order by dt desc) select dt, value, value-lead(value,1) over (order by dt desc) diff_value from foo) select to_char(dt, 'YYYY-MM-DD HH24') period, sum(diff_value) from bar group by period order by period;
// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package admin

import (
	"context"
	"encoding/csv"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"

	"github.com/derat/ascenso/go/db"
)

// handlePostScoresTeams handles a "scoresTeams" POST request.
// It reads teams' scores from Cloud Firestore and writes an HTML scoreboard document to w.
func handlePostScoresTeams(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	teams, _, err := getScores(ctx, client)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed loading scores: %v", err), http.StatusInternalServerError)
		return
	}
	sort.Slice(teams, func(i, j int) bool { return teams[i].Score > teams[j].Score })
	if err := writeScores(w, teams, nil); err != nil {
		http.Error(w, fmt.Sprintf("Failed writing template: %v", err), http.StatusInternalServerError)
		return
	}
}

// handlePostScoresUsers handles a "scoresUsers" POST request.
// It reads users' scores from Cloud Firestore and writes an HTML scoreboard document to w.
func handlePostScoresUsers(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	_, users, err := getScores(ctx, client)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed loading scores: %v", err), http.StatusInternalServerError)
		return
	}
	if err := writeScores(w, nil, users); err != nil {
		http.Error(w, fmt.Sprintf("Failed writing template: %v", err), http.StatusInternalServerError)
		return
	}
}

// handlePostScoresTeamsCSV handles a "scoresTeamsCsv" POST request.
func handlePostScoresTeamsCSV(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	teams, _, err := getScores(ctx, client)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed loading scores: %v", err), http.StatusInternalServerError)
		return
	}
	sort.Slice(teams, func(i, j int) bool { return teams[i].Name < teams[j].Name })

	recs := [][]string{{"team", "name_1", "name_2", "score", "climbs", "height"}}
	for _, team := range teams {
		rec := []string{team.Name}
		if len(team.Users) > 0 {
			rec = append(rec, team.Users[0].Name)
		} else {
			rec = append(rec, "")
		}
		if len(team.Users) > 1 {
			rec = append(rec, team.Users[1].Name)
		} else {
			rec = append(rec, "")
		}
		rec = append(rec, strconv.Itoa(team.Score), strconv.Itoa(team.NumClimbs), strconv.Itoa(team.Height))

		recs = append(recs, rec)
	}

	setCSVHeaders(w.Header(), "teams.csv")
	if err := csv.NewWriter(w).WriteAll(recs); err != nil {
		http.Error(w, fmt.Sprintf("Failed writing teams: %v", err), http.StatusInternalServerError)
	}
}

// handlePostScoresUsersCSV handles a "scoresUsersCsv" POST request.
func handlePostScoresUsersCSV(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	_, users, err := getScores(ctx, client)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed loading scores: %v", err), http.StatusInternalServerError)
		return
	}

	recs := [][]string{{"name", "team", "score", "climbs", "height"}}
	for _, u := range users {
		recs = append(recs, []string{
			u.Name, u.Team, strconv.Itoa(u.Score), strconv.Itoa(u.NumClimbs), strconv.Itoa(u.Height),
		})
	}

	setCSVHeaders(w.Header(), "users.csv")
	if err := csv.NewWriter(w).WriteAll(recs); err != nil {
		http.Error(w, fmt.Sprintf("Failed writing users: %v", err), http.StatusInternalServerError)
	}
}

// setCSVHeaders sets headers on h to indicate a CSV attachment with the given filename.
func setCSVHeaders(h http.Header, fn string) {
	h.Set("Content-Encoding", "UTF-8")
	h.Set("Content-Type", "text/csv; charset=UTF-8")
	h.Set("Content-Disposition", "attachment; filename="+fn)
}

// getScores reads scores from Cloud Firestore and returns summarized data.
func getScores(ctx context.Context, client *firestore.Client) ([]teamSummary, []userSummary, error) {
	// First, load the indexed data so we can look up the points and heights for each route.
	var indexed db.IndexedData
	if err := db.GetDoc(ctx, client.Doc(db.IndexedDataDocPath), &indexed); err != nil {
		return nil, nil, fmt.Errorf("failed getting indexed data: %v", err)
	}

	// Iterate over all of the teams.
	var teams []teamSummary
	var users []userSummary
	it := client.Collection(db.TeamCollectionPath).DocumentRefs(ctx)
	for {
		ref, err := it.Next()
		if err == iterator.Done {
			break
		} else if err != nil {
			return nil, nil, fmt.Errorf("failed getting team ref: %v", err)
		}
		var team db.Team
		if err := db.GetDoc(ctx, ref, &team); err != nil {
			return nil, nil, fmt.Errorf("failed getting team doc: %v", err)
		}

		if len(team.Users) == 0 {
			continue
		}

		ts := teamSummary{Name: team.Name}

		// Iterate over the team's members.
		for _, u := range team.Users {
			score, climbs, height := computeScore(u.Climbs, indexed.Routes)
			ts.Score += score
			ts.NumClimbs += climbs
			ts.Height += height
			us := userSummary{
				Name:      u.Name,
				Team:      team.Name,
				Score:     score,
				NumClimbs: climbs,
				Height:    height,
			}
			ts.Users = append(ts.Users, us)
			users = append(users, us)
		}

		// Sort the team's members by descending score and then alphabetically.
		sort.Slice(ts.Users, func(i, j int) bool {
			if si, sj := ts.Users[i].Score, ts.Users[j].Score; si != sj {
				return si > sj
			}
			return ts.Users[i].Name < ts.Users[j].Name
		})

		teams = append(teams, ts)
	}

	// Sort the users by descending score and then alphabetically.
	sort.Slice(users, func(i, j int) bool {
		if si, sj := users[i].Score, users[j].Score; si != sj {
			return si > sj
		}
		return users[i].Name < users[j].Name
	})

	return teams, users, nil
}

// computeScore iterates over the supplied climbs and returns the user's total score, number of
// climbs, and total height.
func computeScore(climbs map[string]db.ClimbState, routes map[string]db.Route) (points, count, height int) {
	if climbs == nil || routes == nil {
		return 0, 0, 0
	}

	for id, state := range climbs {
		rt, ok := routes[id]
		if !ok {
			continue
		}
		if state == db.Lead {
			points += rt.Lead
			count++
		} else if state == db.TopRope {
			points += rt.TR
			count++
		}
		height += rt.Height
	}
	return points, count, height
}

// teamSummary describes a team's performance.
type teamSummary struct {
	Name      string
	Score     int
	NumClimbs int
	Height    int
	Users     []userSummary
}

// userSummary describes an individual climber's performance.
type userSummary struct {
	Name      string
	Team      string // redundant, but used for per-user CSV
	Score     int
	NumClimbs int
	Height    int
}

// writeScores writes an HTML document describing the scores in teams (if non-empty)
// or users (otherwise) to w.
func writeScores(w io.Writer, teams []teamSummary, users []userSummary) error {
	tmpl, err := template.New("").Parse(strings.TrimLeft(scoresTemplate, "\n"))
	if err != nil {
		return err
	}
	return tmpl.Execute(w, struct {
		SorttableJS template.JS
		Teams       []teamSummary
		Users       []userSummary
	}{
		SorttableJS: template.JS(sorttableJS),
		Teams:       teams,
		Users:       users,
	})
}

const scoresTemplate = `
<!DOCTYPE html>
<html>
  <head>
    <title>Scores</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
      }
      table {
        border: 1px solid #aaa;
        border-collapse: collapse;
      }
      td, th {
        border: 1px solid #aaa;
        max-width: 20em;
        padding: 2px 10px;
        vertical-align: middle;
      }
      th {
        background-color: #ddd;
        font-weight: bold;
        line-height: 1.5;
        text-align: left;
      }
      .num {
        text-align: right;
      } 
    </style>
    <script>
     {{.SorttableJS}}
     // Make sorttable use slower locale-aware sorting.
     sorttable.sort_alpha = function(a,b) { return a[0].localeCompare(b[0]); }
    </script>
  </head>
  <body>
    <table class="sortable">
      <thead>
        <tr>
{{- if .Teams}}
          <th>Team</th>
          <th>Score</th>
          <th>Climbs</th>
          <th>Height</th>
          <th class="sorttable_nosort">Climber</th>
          <th class="sorttable_nosort">Score</th>
          <th class="sorttable_nosort">Climbs</th>
          <th class="sorttable_nosort">Height</th>
{{- else}}
          <th>User</th>
          <th>Team</th>
          <th>Score</th>
          <th>Climbs</th>
          <th>Height</th>
{{- end}}
        </tr>
      </thead>
      <tbody>
{{- if .Teams}}
{{- range .Teams}}
        <tr>
          <td>{{.Name}}</td>
          <td class="num">{{.Score}}</td>
          <td class="num">{{.NumClimbs}}</td>
          <td class="num" sorttable_customkey="{{.Height}}">{{.Height}}'</td>
          <td>
{{- range .Users}}
            {{.Name}}<br>
{{- end}}
          </td>
          <td class="num">
{{- range .Users}}
            {{.Score}}<br>
{{- end}}
          </td>
          <td class="num">
{{- range .Users}}
            {{.NumClimbs}}<br>
{{- end}}
          </td>
          <td class="num">
{{- range .Users}}
            {{.Height}}'<br>
{{- end}}
          </td>
        </tr>
{{- end}}
{{- else}}
{{- range .Users}}
        <tr>
          <td>{{.Name}}</td>
          <td>{{.Team}}</td>
          <td class="num">{{.Score}}</td>
          <td class="num">{{.NumClimbs}}</td>
          <td class="num" sorttable_customkey="{{.Height}}">{{.Height}}'</td>
        </tr>
{{- end}}
{{- end}}
      </tbody>
    </table>
  </body>
</html>
`

// Downloaded from https://www.kryogenix.org/code/browser/sorttable/sorttable.js on 20211025.
// See https://www.kryogenix.org/code/browser/sorttable/ for more info.
//
// The following changes have been made:
// - Uncomment sorttable.shaker_sort() and comment row_array.sort() commented to get
//   slower-but-stable sorting.
// - Add row_array.reverse() after sorttable.shaker_sort() to sort in descending order by default.
// - Add a backslash to </script> in the opening comment so it isn't interpreted as a closing tag
//   by browsers.
const sorttableJS = `
/*
  SortTable
  version 2
  7th April 2007
  Stuart Langridge, http://www.kryogenix.org/code/browser/sorttable/

  Instructions:
  Download this file
  Add <script src="sorttable.js"><\/script> to your HTML
  Add class="sortable" to any table you'd like to make sortable
  Click on the headers to sort

  Thanks to many, many people for contributions and suggestions.
  Licenced as X11: http://www.kryogenix.org/code/browser/licence.html
  This basically means: do what you want with it.
*/


var stIsIE = /*@cc_on!@*/false;

sorttable = {
  init: function() {
    // quit if this function has already been called
    if (arguments.callee.done) return;
    // flag this function so we don't do the same thing twice
    arguments.callee.done = true;
    // kill the timer
    if (_timer) clearInterval(_timer);

    if (!document.createElement || !document.getElementsByTagName) return;

    sorttable.DATE_RE = /^(\d\d?)[\/\.-](\d\d?)[\/\.-]((\d\d)?\d\d)$/;

    forEach(document.getElementsByTagName('table'), function(table) {
      if (table.className.search(/\bsortable\b/) != -1) {
        sorttable.makeSortable(table);
      }
    });

  },

  makeSortable: function(table) {
    if (table.getElementsByTagName('thead').length == 0) {
      // table doesn't have a tHead. Since it should have, create one and
      // put the first table row in it.
      the = document.createElement('thead');
      the.appendChild(table.rows[0]);
      table.insertBefore(the,table.firstChild);
    }
    // Safari doesn't support table.tHead, sigh
    if (table.tHead == null) table.tHead = table.getElementsByTagName('thead')[0];

    if (table.tHead.rows.length != 1) return; // can't cope with two header rows

    // Sorttable v1 put rows with a class of "sortbottom" at the bottom (as
    // "total" rows, for example). This is B&R, since what you're supposed
    // to do is put them in a tfoot. So, if there are sortbottom rows,
    // for backwards compatibility, move them to tfoot (creating it if needed).
    sortbottomrows = [];
    for (var i=0; i<table.rows.length; i++) {
      if (table.rows[i].className.search(/\bsortbottom\b/) != -1) {
        sortbottomrows[sortbottomrows.length] = table.rows[i];
      }
    }
    if (sortbottomrows) {
      if (table.tFoot == null) {
        // table doesn't have a tfoot. Create one.
        tfo = document.createElement('tfoot');
        table.appendChild(tfo);
      }
      for (var i=0; i<sortbottomrows.length; i++) {
        tfo.appendChild(sortbottomrows[i]);
      }
      delete sortbottomrows;
    }

    // work through each column and calculate its type
    headrow = table.tHead.rows[0].cells;
    for (var i=0; i<headrow.length; i++) {
      // manually override the type with a sorttable_type attribute
      if (!headrow[i].className.match(/\bsorttable_nosort\b/)) { // skip this col
        mtch = headrow[i].className.match(/\bsorttable_([a-z0-9]+)\b/);
        if (mtch) { override = mtch[1]; }
	      if (mtch && typeof sorttable["sort_"+override] == 'function') {
	        headrow[i].sorttable_sortfunction = sorttable["sort_"+override];
	      } else {
	        headrow[i].sorttable_sortfunction = sorttable.guessType(table,i);
	      }
	      // make it clickable to sort
	      headrow[i].sorttable_columnindex = i;
	      headrow[i].sorttable_tbody = table.tBodies[0];
	      dean_addEvent(headrow[i],"click", sorttable.innerSortFunction = function(e) {

          if (this.className.search(/\bsorttable_sorted\b/) != -1) {
            // if we're already sorted by this column, just
            // reverse the table, which is quicker
            sorttable.reverse(this.sorttable_tbody);
            this.className = this.className.replace('sorttable_sorted',
                                                    'sorttable_sorted_reverse');
            this.removeChild(document.getElementById('sorttable_sortfwdind'));
            sortrevind = document.createElement('span');
            sortrevind.id = "sorttable_sortrevind";
            sortrevind.innerHTML = stIsIE ? '&nbsp<font face="webdings">5</font>' : '&nbsp;&#x25B4;';
            this.appendChild(sortrevind);
            return;
          }
          if (this.className.search(/\bsorttable_sorted_reverse\b/) != -1) {
            // if we're already sorted by this column in reverse, just
            // re-reverse the table, which is quicker
            sorttable.reverse(this.sorttable_tbody);
            this.className = this.className.replace('sorttable_sorted_reverse',
                                                    'sorttable_sorted');
            this.removeChild(document.getElementById('sorttable_sortrevind'));
            sortfwdind = document.createElement('span');
            sortfwdind.id = "sorttable_sortfwdind";
            sortfwdind.innerHTML = stIsIE ? '&nbsp<font face="webdings">6</font>' : '&nbsp;&#x25BE;';
            this.appendChild(sortfwdind);
            return;
          }

          // remove sorttable_sorted classes
          theadrow = this.parentNode;
          forEach(theadrow.childNodes, function(cell) {
            if (cell.nodeType == 1) { // an element
              cell.className = cell.className.replace('sorttable_sorted_reverse','');
              cell.className = cell.className.replace('sorttable_sorted','');
            }
          });
          sortfwdind = document.getElementById('sorttable_sortfwdind');
          if (sortfwdind) { sortfwdind.parentNode.removeChild(sortfwdind); }
          sortrevind = document.getElementById('sorttable_sortrevind');
          if (sortrevind) { sortrevind.parentNode.removeChild(sortrevind); }

          this.className += ' sorttable_sorted';
          sortfwdind = document.createElement('span');
          sortfwdind.id = "sorttable_sortfwdind";
          sortfwdind.innerHTML = stIsIE ? '&nbsp<font face="webdings">6</font>' : '&nbsp;&#x25BE;';
          this.appendChild(sortfwdind);

	        // build an array to sort. This is a Schwartzian transform thing,
	        // i.e., we "decorate" each row with the actual sort key,
	        // sort based on the sort keys, and then put the rows back in order
	        // which is a lot faster because you only do getInnerText once per row
	        row_array = [];
	        col = this.sorttable_columnindex;
	        rows = this.sorttable_tbody.rows;
	        for (var j=0; j<rows.length; j++) {
	          row_array[row_array.length] = [sorttable.getInnerText(rows[j].cells[col]), rows[j]];
	        }
	        /* If you want a stable sort, uncomment the following line */
	        sorttable.shaker_sort(row_array, this.sorttable_sortfunction);
	        /* and comment out this one */
	        //row_array.sort(this.sorttable_sortfunction);
	        row_array.reverse();

	        tb = this.sorttable_tbody;
	        for (var j=0; j<row_array.length; j++) {
	          tb.appendChild(row_array[j][1]);
	        }

	        delete row_array;
	      });
	    }
    }
  },

  guessType: function(table, column) {
    // guess the type of a column based on its first non-blank row
    sortfn = sorttable.sort_alpha;
    for (var i=0; i<table.tBodies[0].rows.length; i++) {
      text = sorttable.getInnerText(table.tBodies[0].rows[i].cells[column]);
      if (text != '') {
        if (text.match(/^-?[£$¤]?[\d,.]+%?$/)) {
          return sorttable.sort_numeric;
        }
        // check for a date: dd/mm/yyyy or dd/mm/yy
        // can have / or . or - as separator
        // can be mm/dd as well
        possdate = text.match(sorttable.DATE_RE)
        if (possdate) {
          // looks like a date
          first = parseInt(possdate[1]);
          second = parseInt(possdate[2]);
          if (first > 12) {
            // definitely dd/mm
            return sorttable.sort_ddmm;
          } else if (second > 12) {
            return sorttable.sort_mmdd;
          } else {
            // looks like a date, but we can't tell which, so assume
            // that it's dd/mm (English imperialism!) and keep looking
            sortfn = sorttable.sort_ddmm;
          }
        }
      }
    }
    return sortfn;
  },

  getInnerText: function(node) {
    // gets the text we want to use for sorting for a cell.
    // strips leading and trailing whitespace.
    // this is *not* a generic getInnerText function; it's special to sorttable.
    // for example, you can override the cell text with a customkey attribute.
    // it also gets .value for <input> fields.

    if (!node) return "";

    hasInputs = (typeof node.getElementsByTagName == 'function') &&
                 node.getElementsByTagName('input').length;

    if (node.getAttribute("sorttable_customkey") != null) {
      return node.getAttribute("sorttable_customkey");
    }
    else if (typeof node.textContent != 'undefined' && !hasInputs) {
      return node.textContent.replace(/^\s+|\s+$/g, '');
    }
    else if (typeof node.innerText != 'undefined' && !hasInputs) {
      return node.innerText.replace(/^\s+|\s+$/g, '');
    }
    else if (typeof node.text != 'undefined' && !hasInputs) {
      return node.text.replace(/^\s+|\s+$/g, '');
    }
    else {
      switch (node.nodeType) {
        case 3:
          if (node.nodeName.toLowerCase() == 'input') {
            return node.value.replace(/^\s+|\s+$/g, '');
          }
        case 4:
          return node.nodeValue.replace(/^\s+|\s+$/g, '');
          break;
        case 1:
        case 11:
          var innerText = '';
          for (var i = 0; i < node.childNodes.length; i++) {
            innerText += sorttable.getInnerText(node.childNodes[i]);
          }
          return innerText.replace(/^\s+|\s+$/g, '');
          break;
        default:
          return '';
      }
    }
  },

  reverse: function(tbody) {
    // reverse the rows in a tbody
    newrows = [];
    for (var i=0; i<tbody.rows.length; i++) {
      newrows[newrows.length] = tbody.rows[i];
    }
    for (var i=newrows.length-1; i>=0; i--) {
       tbody.appendChild(newrows[i]);
    }
    delete newrows;
  },

  /* sort functions
     each sort function takes two parameters, a and b
     you are comparing a[0] and b[0] */
  sort_numeric: function(a,b) {
    aa = parseFloat(a[0].replace(/[^0-9.-]/g,''));
    if (isNaN(aa)) aa = 0;
    bb = parseFloat(b[0].replace(/[^0-9.-]/g,''));
    if (isNaN(bb)) bb = 0;
    return aa-bb;
  },
  sort_alpha: function(a,b) {
    if (a[0]==b[0]) return 0;
    if (a[0]<b[0]) return -1;
    return 1;
  },
  sort_ddmm: function(a,b) {
    mtch = a[0].match(sorttable.DATE_RE);
    y = mtch[3]; m = mtch[2]; d = mtch[1];
    if (m.length == 1) m = '0'+m;
    if (d.length == 1) d = '0'+d;
    dt1 = y+m+d;
    mtch = b[0].match(sorttable.DATE_RE);
    y = mtch[3]; m = mtch[2]; d = mtch[1];
    if (m.length == 1) m = '0'+m;
    if (d.length == 1) d = '0'+d;
    dt2 = y+m+d;
    if (dt1==dt2) return 0;
    if (dt1<dt2) return -1;
    return 1;
  },
  sort_mmdd: function(a,b) {
    mtch = a[0].match(sorttable.DATE_RE);
    y = mtch[3]; d = mtch[2]; m = mtch[1];
    if (m.length == 1) m = '0'+m;
    if (d.length == 1) d = '0'+d;
    dt1 = y+m+d;
    mtch = b[0].match(sorttable.DATE_RE);
    y = mtch[3]; d = mtch[2]; m = mtch[1];
    if (m.length == 1) m = '0'+m;
    if (d.length == 1) d = '0'+d;
    dt2 = y+m+d;
    if (dt1==dt2) return 0;
    if (dt1<dt2) return -1;
    return 1;
  },

  shaker_sort: function(list, comp_func) {
    // A stable sort function to allow multi-level sorting of data
    // see: http://en.wikipedia.org/wiki/Cocktail_sort
    // thanks to Joseph Nahmias
    var b = 0;
    var t = list.length - 1;
    var swap = true;

    while(swap) {
        swap = false;
        for(var i = b; i < t; ++i) {
            if ( comp_func(list[i], list[i+1]) > 0 ) {
                var q = list[i]; list[i] = list[i+1]; list[i+1] = q;
                swap = true;
            }
        } // for
        t--;

        if (!swap) break;

        for(var i = t; i > b; --i) {
            if ( comp_func(list[i], list[i-1]) < 0 ) {
                var q = list[i]; list[i] = list[i-1]; list[i-1] = q;
                swap = true;
            }
        } // for
        b++;

    } // while(swap)
  }
}

/* ******************************************************************
   Supporting functions: bundled here to avoid depending on a library
   ****************************************************************** */

// Dean Edwards/Matthias Miller/John Resig

/* for Mozilla/Opera9 */
if (document.addEventListener) {
    document.addEventListener("DOMContentLoaded", sorttable.init, false);
}

/* for Internet Explorer */
/*@cc_on @*/
/*@if (@_win32)
    document.write("<script id=__ie_onload defer src=javascript:void(0)><\/script>");
    var script = document.getElementById("__ie_onload");
    script.onreadystatechange = function() {
        if (this.readyState == "complete") {
            sorttable.init(); // call the onload handler
        }
    };
/*@end @*/

/* for Safari */
if (/WebKit/i.test(navigator.userAgent)) { // sniff
    var _timer = setInterval(function() {
        if (/loaded|complete/.test(document.readyState)) {
            sorttable.init(); // call the onload handler
        }
    }, 10);
}

/* for other browsers */
window.onload = sorttable.init;

// written by Dean Edwards, 2005
// with input from Tino Zijdel, Matthias Miller, Diego Perini

// http://dean.edwards.name/weblog/2005/10/add-event/

function dean_addEvent(element, type, handler) {
	if (element.addEventListener) {
		element.addEventListener(type, handler, false);
	} else {
		// assign each event handler a unique ID
		if (!handler.$$guid) handler.$$guid = dean_addEvent.guid++;
		// create a hash table of event types for the element
		if (!element.events) element.events = {};
		// create a hash table of event handlers for each element/event pair
		var handlers = element.events[type];
		if (!handlers) {
			handlers = element.events[type] = {};
			// store the existing event handler (if there is one)
			if (element["on" + type]) {
				handlers[0] = element["on" + type];
			}
		}
		// store the event handler in the hash table
		handlers[handler.$$guid] = handler;
		// assign a global event handler to do all the work
		element["on" + type] = handleEvent;
	}
};
// a counter used to create unique IDs
dean_addEvent.guid = 1;

function removeEvent(element, type, handler) {
	if (element.removeEventListener) {
		element.removeEventListener(type, handler, false);
	} else {
		// delete the event handler from the hash table
		if (element.events && element.events[type]) {
			delete element.events[type][handler.$$guid];
		}
	}
};

function handleEvent(event) {
	var returnValue = true;
	// grab the event object (IE uses a global event object)
	event = event || fixEvent(((this.ownerDocument || this.document || this).parentWindow || window).event);
	// get a reference to the hash table of event handlers
	var handlers = this.events[event.type];
	// execute each event handler
	for (var i in handlers) {
		this.$$handleEvent = handlers[i];
		if (this.$$handleEvent(event) === false) {
			returnValue = false;
		}
	}
	return returnValue;
};

function fixEvent(event) {
	// add W3C standard event methods
	event.preventDefault = fixEvent.preventDefault;
	event.stopPropagation = fixEvent.stopPropagation;
	return event;
};
fixEvent.preventDefault = function() {
	this.returnValue = false;
};
fixEvent.stopPropagation = function() {
  this.cancelBubble = true;
}

// Dean's forEach: http://dean.edwards.name/base/forEach.js
/*
	forEach, version 1.0
	Copyright 2006, Dean Edwards
	License: http://www.opensource.org/licenses/mit-license.php
*/

// array-like enumeration
if (!Array.forEach) { // mozilla already supports this
	Array.forEach = function(array, block, context) {
		for (var i = 0; i < array.length; i++) {
			block.call(context, array[i], i, array);
		}
	};
}

// generic enumeration
Function.prototype.forEach = function(object, block, context) {
	for (var key in object) {
		if (typeof this.prototype[key] == "undefined") {
			block.call(context, object[key], key, object);
		}
	}
};

// character enumeration
String.forEach = function(string, block, context) {
	Array.forEach(string.split(""), function(chr, index) {
		block.call(context, chr, index, string);
	});
};

// globally resolve forEach enumeration
var forEach = function(object, block, context) {
	if (object) {
		var resolve = Object; // default
		if (object instanceof Function) {
			// functions have a "length" property
			resolve = Function;
		} else if (object.forEach instanceof Function) {
			// the object implements a custom forEach method so use that
			object.forEach(block, context);
			return;
		} else if (typeof object == "string") {
			// the object is a string
			resolve = String;
		} else if (typeof object.length == "number") {
			// the object is array-like
			resolve = Array;
		}
		resolve.forEach(object, block, context);
	}
};
`
